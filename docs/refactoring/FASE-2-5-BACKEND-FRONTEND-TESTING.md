# RLAPP - Plan de Refactorización: Fases 2-5
## Backend CQRS, Frontend, Testing y Deploy

**Versión:** 1.0  
**Fecha:** 2026-03-19  
**Estado:** DRAFT  

---

## Tabla de Contenidos

1. [Fase 2: Backend CQRS + Handlers](#fase-2)
2. [Fase 3: Frontend Next.js Refactorizado](#fase-3)
3. [Fase 4: Testing Strategy](#fase-4)
4. [Fase 5: Documentación y Deploy](#fase-5)

---

## Fase 2: Backend CQRS + Handlers {#fase-2}

### 2.1 Command Handlers (Pipeline CQRS)

```csharp
// ===== PATIENT COMMAND HANDLERS =====

namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using WaitingRoom.Application.Commands;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Repositories;
using WaitingRoom.Domain.ValueObjects;
using BuildingBlocks.EventSourcing;

/// <summary>
/// Handler: Register Patient (Public)
/// 
/// Responsible for:
/// 1. Generating patientId (UUID)
/// 2. Creating Patient aggregate (REGISTERED state)
/// 3. Persisting PatientRegistered event to Event Store
/// 4. Publishing event via Outbox Pattern
/// 
/// Idempotency: Idempotency key prevents duplicate registrations
/// </summary>
public sealed class RegisterPatientCommandHandler : IRequestHandler<RegisterPatientCommand, RegisterPatientResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public RegisterPatientCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<RegisterPatientResponse> Handle(
        RegisterPatientCommand request,
        CancellationToken cancellationToken)
    {
        // Check if patient with same identity already registered today
        var existingPatient = await _patientRepository.GetByIdentityAsync(
            request.PatientIdentity, 
            cancellationToken);

        if (existingPatient?.CurrentState == PatientState.Registered)
        {
            // Idempotent: Return existing patient
            return new RegisterPatientResponse 
            { 
                PatientId = existingPatient.Id,
                Message = "Patient already registered today"
            };
        }

        var patientId = Guid.NewGuid().ToString("D");
        var identity = new PatientIdentity(request.PatientIdentity);

        var patient = Patient.Create(
            patientId,
            identity,
            request.PatientName,
            request.PhoneNumber,
            new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = "Patient",
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            });

        // Persist
        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new RegisterPatientResponse 
        { 
            PatientId = patientId,
            Message = "Patient registered successfully"
        };
    }
}

/// <summary>
/// Handler: Receptionist marks patient as waiting
/// 
/// Called after receptionist verifies patient identity and checks them in.
/// Transitions: REGISTERED → WAITING
/// </summary>
public sealed class MarkPatientAsWaitingCommandHandler : 
    IRequestHandler<MarkPatientAsWaitingCommand, MarkPatientAsWaitingResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public MarkPatientAsWaitingCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<MarkPatientAsWaitingResponse> Handle(
        MarkPatientAsWaitingCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        patient.MarkAsWaiting(new MarkPatientAsWaitingRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = request.Actor,
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            OccurredAt = _clock.UtcNow
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new MarkPatientAsWaitingResponse { Success = true };
    }
}

/// <summary>
/// Handler: Receptionist assigns consulting room to patient
/// 
/// Transitions: WAITING → ASSIGNED
/// Invariant check: Room must be active
/// </summary>
public sealed class AssignConsultingRoomCommandHandler : 
    IRequestHandler<AssignConsultingRoomCommand, AssignConsultingRoomResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IConsultingRoomRepository _roomRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public AssignConsultingRoomCommandHandler(
        IPatientRepository patientRepository,
        IConsultingRoomRepository roomRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _roomRepository = roomRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<AssignConsultingRoomResponse> Handle(
        AssignConsultingRoomCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        var room = await _roomRepository.GetByIdAsync(request.ConsultingRoomId, cancellationToken)
            ?? throw new DomainException($"Room {request.ConsultingRoomId} not found");

        patient.AssignConsultingRoom(new AssignConsultingRoomRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = request.Actor,
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            ConsultingRoomId = request.ConsultingRoomId,
            IsRoomActive = room.IsActive,
            OccurredAt = _clock.UtcNow
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new AssignConsultingRoomResponse { Success = true };
    }
}

/// <summary>
/// Handler: Doctor starts consultation
/// 
/// Transitions: ASSIGNED → IN_CONSULTATION
/// Also updates ConsultingRoom occupancy
/// </summary>
public sealed class StartConsultationCommandHandler : 
    IRequestHandler<StartConsultationCommand, StartConsultationResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IConsultingRoomRepository _roomRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public StartConsultationCommandHandler(
        IPatientRepository patientRepository,
        IConsultingRoomRepository roomRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _roomRepository = roomRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<StartConsultationResponse> Handle(
        StartConsultationCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        patient.StartConsultation(new StartConsultationRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = request.Actor,
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            OccurredAt = _clock.UtcNow
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new StartConsultationResponse { Success = true };
    }
}

/// <summary>
/// Handler: Doctor finishes consultation
/// 
/// Transitions: IN_CONSULTATION → FINISHED_CONSULTATION
/// Also marks ConsultingRoom as available
/// </summary>
public sealed class FinishConsultationCommandHandler : 
    IRequestHandler<FinishConsultationCommand, FinishConsultationResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public FinishConsultationCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<FinishConsultationResponse> Handle(
        FinishConsultationCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        patient.FinishConsultation(new FinishConsultationRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = request.Actor,
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            OccurredAt = _clock.UtcNow,
            Notes = request.Notes
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new FinishConsultationResponse { Success = true };
    }
}

/// <summary>
/// Handler: Patient arrives at cashier
/// 
/// Transitions: FINISHED_CONSULTATION → AT_CASHIER
/// Generates random payment amount for simulation
/// </summary>
public sealed class ArriveCashierCommandHandler : 
    IRequestHandler<ArriveCashierCommand, ArriveCashierResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;
    private readonly Random _random = new();

    public ArriveCashierCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<ArriveCashierResponse> Handle(
        ArriveCashierCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        // Generate random payment amount (100 - 500)
        var paymentAmount = (decimal)(100 + _random.NextDouble() * 400);

        patient.ArriveCashier(new ArriveCashierRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = "Cashier",
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            OccurredAt = _clock.UtcNow,
            GeneratedPaymentAmount = paymentAmount
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new ArriveCashierResponse 
        { 
            Success = true,
            PaymentAmount = paymentAmount
        };
    }
}

/// <summary>
/// Handler: Cashier validates payment
/// 
/// Transitions: AT_CASHIER → PAYMENT_VALIDATED
/// </summary>
public sealed class ValidatePaymentCommandHandler : 
    IRequestHandler<ValidatePaymentCommand, ValidatePaymentResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public ValidatePaymentCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<ValidatePaymentResponse> Handle(
        ValidatePaymentCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        patient.ValidatePayment(new ValidatePaymentRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = "Cashier",
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            OccurredAt = _clock.UtcNow
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new ValidatePaymentResponse { Success = true };
    }
}

/// <summary>
/// Handler: Complete patient process
/// 
/// Transitions: PAYMENT_VALIDATED → COMPLETED
/// </summary>
public sealed class CompletePatientCommandHandler : 
    IRequestHandler<CompletePatientCommand, CompletePatientResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public CompletePatientCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository;
        _eventStore = eventStore;
        _eventPublisher = eventPublisher;
        _clock = clock;
    }

    public async Task<CompletePatientResponse> Handle(
        CompletePatientCommand request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken)
            ?? throw new DomainException($"Patient {request.PatientId} not found");

        patient.Complete(new CompletePatientRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _clock.UtcNow,
                CorrelationId = request.CorrelationId,
                CausationId = request.CausationId,
                Actor = "System",
                IdempotencyKey = request.IdempotencyKey,
                SchemaVersion = 1
            },
            OccurredAt = _clock.UtcNow
        });

        await _eventStore.AppendAsync(patient, cancellationToken);
        await _eventPublisher.PublishAsync(patient.GetDomainEvents(), cancellationToken);

        return new CompletePatientResponse { Success = true };
    }
}
```

### 2.2 Query Handlers (Read Side)

```csharp
namespace WaitingRoom.Application.QueryHandlers;

using MediatR;
using WaitingRoom.Application.Queries;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Infrastructure.Persistence;

/// <summary>
/// Handler: Get patient state (read model)
/// </summary>
public sealed class GetPatientStateQueryHandler : 
    IRequestHandler<GetPatientStateQuery, PatientStateDto>
{
    private readonly IPatientStateRepository _patientStateRepository;

    public GetPatientStateQueryHandler(IPatientStateRepository patientStateRepository)
    {
        _patientStateRepository = patientStateRepository;
    }

    public async Task<PatientStateDto> Handle(
        GetPatientStateQuery request,
        CancellationToken cancellationToken)
    {
        var patientState = await _patientStateRepository.GetByIdAsync(
            request.PatientId, 
            cancellationToken)
            ?? throw new ApplicationException($"Patient {request.PatientId} not found");

        return new PatientStateDto
        {
            PatientId = patientState.PatientId,
            PatientIdentity = patientState.PatientIdentity,
            PatientName = patientState.PatientName,
            CurrentState = patientState.CurrentState,
            AssignedRoomId = patientState.AssignedRoomId,
            PaymentAmount = patientState.PaymentAmount,
            WaitingStartedAt = patientState.WaitingStartedAt,
            ConsultationStartedAt = patientState.ConsultationStartedAt,
            PaymentValidatedAt = patientState.PaymentValidatedAt,
            CompletedAt = patientState.CompletedAt
        };
    }
}

/// <summary>
/// Handler: Get all patients in WAITING state
/// Used by reception to see who's available for assignment
/// </summary>
public sealed class GetWaitingPatientsQueryHandler : 
    IRequestHandler<GetWaitingPatientsQuery, List<PatientSummaryDto>>
{
    private readonly IPatientStateRepository _patientStateRepository;

    public GetWaitingPatientsQueryHandler(IPatientStateRepository patientStateRepository)
    {
        _patientStateRepository = patientStateRepository;
    }

    public async Task<List<PatientSummaryDto>> Handle(
        GetWaitingPatientsQuery request,
        CancellationToken cancellationToken)
    {
        var waitingPatients = await _patientStateRepository.GetByStateAsync(
            "Waiting",
            cancellationToken);

        return waitingPatients
            .OrderBy(p => p.WaitingStartedAt)
            .Select(p => new PatientSummaryDto
            {
                PatientId = p.PatientId,
                PatientIdentity = p.PatientIdentity,
                PatientName = p.PatientName,
                WaitingTime = DateTime.UtcNow - (p.WaitingStartedAt ?? DateTime.UtcNow)
            })
            .ToList();
    }
}

/// <summary>
/// Handler: Get consulting room occupancy
/// </summary>
public sealed class GetConsultingRoomOccupancyQueryHandler : 
    IRequestHandler<GetConsultingRoomOccupancyQuery, ConsultingRoomOccupancyDto>
{
    private readonly IConsultingRoomOccupancyRepository _occupancyRepository;

    public GetConsultingRoomOccupancyQueryHandler(
        IConsultingRoomOccupancyRepository occupancyRepository)
    {
        _occupancyRepository = occupancyRepository;
    }

    public async Task<ConsultingRoomOccupancyDto> Handle(
        GetConsultingRoomOccupancyQuery request,
        CancellationToken cancellationToken)
    {
        var rooms = await _occupancyRepository.GetAllAsync(cancellationToken);

        return new ConsultingRoomOccupancyDto
        {
            TotalRooms = rooms.Count,
            ActiveRooms = rooms.Count(r => r.IsActive),
            OccupiedRooms = rooms.Count(r => r.CurrentPatientId != null),
            RoomDetails = rooms.Select(r => new RoomDetailDto
            {
                RoomId = r.RoomId,
                RoomName = r.RoomName,
                IsActive = r.IsActive,
                CurrentPatientId = r.CurrentPatientId,
                PatientName = r.PatientName,
                OccupancyTime = r.AttentionStartedAt.HasValue
                    ? DateTime.UtcNow - r.AttentionStartedAt.Value
                    : null
            }).ToList()
        };
    }
}

/// <summary>
/// Handler: Get patients in AT_CASHIER state
/// Used by cashier to see their queue
/// </summary>
public sealed class GetCashierQueueQueryHandler : 
    IRequestHandler<GetCashierQueueQuery, List<CashierQueueItemDto>>
{
    private readonly ICashierQueueRepository _cashierQueueRepository;

    public GetCashierQueueQueryHandler(ICashierQueueRepository cashierQueueRepository)
    {
        _cashierQueueRepository = cashierQueueRepository;
    }

    public async Task<List<CashierQueueItemDto>> Handle(
        GetCashierQueueQuery request,
        CancellationToken cancellationToken)
    {
        var cashierQueue = await _cashierQueueRepository.GetAllAsync(cancellationToken);

        return cashierQueue
            .OrderBy(c => c.ArrivedAtCashierAt)
            .Select(c => new CashierQueueItemDto
            {
                PatientId = c.PatientId,
                PatientIdentity = c.PatientIdentity,
                PatientName = c.PatientName,
                PaymentAmount = c.PaymentAmount,
                WaitingTime = DateTime.UtcNow - c.ArrivedAtCashierAt,
                PaymentAttempts = c.PaymentAttempts
            })
            .ToList();
    }
}
```

### 2.3 API Endpoints Refactorizados

```csharp
namespace WaitingRoom.API;

using MediatR;
using Microsoft.AspNetCore.Mvc;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Queries;

public static class PatientEndpoints
{
    public static void MapPatientEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/patients");

        // POST /api/patients/register - Public
        group.MapPost("/register", RegisterPatient)
            .WithName("RegisterPatient")
            .WithOpenApi()
            .Produces<RegisterPatientResponse>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        // POST /api/patients/{patientId}/mark-waiting - Receptionist
        group.MapPost("/{patientId}/mark-waiting", MarkPatientAsWaiting)
            .WithName("MarkPatientAsWaiting")
            .RequireAuthorization("Receptionist")
            .Produces<MarkPatientAsWaitingResponse>(StatusCodes.Status200OK);

        // POST /api/patients/{patientId}/assign-room - Receptionist
        group.MapPost("/{patientId}/assign-room", AssignConsultingRoom)
            .WithName("AssignConsultingRoom")
            .RequireAuthorization("Receptionist")
            .Produces<AssignConsultingRoomResponse>(StatusCodes.Status200OK);

        // POST /api/patients/{patientId}/start-consultation - Doctor
        group.MapPost("/{patientId}/start-consultation", StartConsultation)
            .WithName("StartConsultation")
            .RequireAuthorization("Doctor")
            .Produces<StartConsultationResponse>(StatusCodes.Status200OK);

        // POST /api/patients/{patientId}/finish-consultation - Doctor
        group.MapPost("/{patientId}/finish-consultation", FinishConsultation)
            .WithName("FinishConsultation")
            .RequireAuthorization("Doctor")
            .Produces<FinishConsultationResponse>(StatusCodes.Status200OK);

        // POST /api/patients/{patientId}/arrive-cashier - System
        group.MapPost("/{patientId}/arrive-cashier", ArriveCashier)
            .WithName("ArriveCashier")
            .Produces<ArriveCashierResponse>(StatusCodes.Status200OK);

        // POST /api/patients/{patientId}/validate-payment - Cashier
        group.MapPost("/{patientId}/validate-payment", ValidatePayment)
            .WithName("ValidatePayment")
            .RequireAuthorization("Cashier")
            .Produces<ValidatePaymentResponse>(StatusCodes.Status200OK);

        // POST /api/patients/{patientId}/complete - System
        group.MapPost("/{patientId}/complete", CompletePatient)
            .WithName("CompletePatient")
            .Produces<CompletePatientResponse>(StatusCodes.Status200OK);

        // GET /api/patients/{patientId}/state - Any
        group.MapGet("/{patientId}/state", GetPatientState)
            .WithName("GetPatientState")
            .Produces<PatientStateDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        // GET /api/patients/waiting - Receptionist
        group.MapGet("/waiting", GetWaitingPatients)
            .WithName("GetWaitingPatients")
            .RequireAuthorization("Receptionist")
            .Produces<List<PatientSummaryDto>>(StatusCodes.Status200OK);
    }

    private static async Task<IResult> RegisterPatient(
        [FromBody] RegisterPatientRequest request,
        IMediator mediator,
        ILogger<PatientEndpoints> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var command = new RegisterPatientCommand
            {
                PatientIdentity = request.PatientIdentity,
                PatientName = request.PatientName,
                PhoneNumber = request.PhoneNumber,
                IdempotencyKey = request.IdempotencyKey ?? Guid.NewGuid().ToString()
            };

            var result = await mediator.Send(command, cancellationToken);

            return Results.Created($"/api/patients/{result.PatientId}", result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error registering patient");
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    // Similar implementations for other endpoints...

    private static async Task<IResult> GetPatientState(
        [FromRoute] string patientId,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var query = new GetPatientStateQuery { PatientId = patientId };
        var result = await mediator.Send(query, cancellationToken);
        return Results.Ok(result);
    }
}

public static class ConsultingRoomEndpoints
{
    public static void MapConsultingRoomEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/consulting-rooms");

        // GET /api/consulting-rooms/occupancy - Dashboard
        group.MapGet("/occupancy", GetOccupancy)
            .WithName("GetConsultingRoomOccupancy")
            .Produces<ConsultingRoomOccupancyDto>(StatusCodes.Status200OK);

        // POST /api/consulting-rooms/{roomId}/activate - Admin Only
        group.MapPost("/{roomId}/activate", ActivateRoom)
            .WithName("ActivateConsultingRoom")
            .RequireAuthorization("Administrator")
            .Produces<ActivateConsultingRoomResponse>(StatusCodes.Status200OK);

        // POST /api/consulting-rooms/{roomId}/deactivate - Admin Only
        group.MapPost("/{roomId}/deactivate", DeactivateRoom)
            .WithName("DeactivateConsultingRoom")
            .RequireAuthorization("Administrator")
            .Produces<DeactivateConsultingRoomResponse>(StatusCodes.Status200OK);
    }

    private static async Task<IResult> GetOccupancy(
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var query = new GetConsultingRoomOccupancyQuery();
        var result = await mediator.Send(query, cancellationToken);
        return Results.Ok(result);
    }

    // Similar for activate/deactivate...
}
```

### 2.4 SignalR Hub Refactorizado

```csharp
namespace WaitingRoom.API.Hubs;

using Microsoft.AspNetCore.SignalR;
using WaitingRoom.Application.Queries;
using MediatR;

/// <summary>
/// SignalR Hub: Real-time updates for all stakeholders
/// 
/// Channels (SignalR Groups):
/// - dashboard: Admins/supervisors viewing overall status
/// - reception: Receptionists managing check-ins
/// - consulting-room-{roomId}: Doctors in specific rooms
/// - cashier: Cashiers managing payments
/// - waiting-room-display: Public displays in waiting area
/// </summary>
public sealed class WaitingRoomHub : Hub
{
    private readonly IMediator _mediator;
    private readonly ILogger<WaitingRoomHub> _logger;

    public WaitingRoomHub(IMediator mediator, ILogger<WaitingRoomHub> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value ?? "Anonymous";
        var role = Context.User?.FindFirst("role")?.Value ?? "Unknown";
        
        _logger.LogInformation("User {UserId} (role: {Role}) connected", userId, role);

        // Auto-join groups based on role
        switch (role.ToLowerInvariant())
        {
            case "receptionist":
                await Groups.AddToGroupAsync(Context.ConnectionId, "reception");
                await Groups.AddToGroupAsync(Context.ConnectionId, "waiting-room-display");
                break;
            case "doctor":
                await Groups.AddToGroupAsync(Context.ConnectionId, "consulting-rooms");
                break;
            case "cashier":
                await Groups.AddToGroupAsync(Context.ConnectionId, "cashier");
                break;
            case "administrator":
                await Groups.AddToGroupAsync(Context.ConnectionId, "dashboard");
                break;
        }

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Broadcast: Patient registered (all displays)
    /// </summary>
    public static async Task BroadcastPatientRegistered(
        IHubContext<WaitingRoomHub> hub,
        string patientId,
        string patientName)
    {
        await hub.Clients.Groups("waiting-room-display")
            .SendAsync("PatientRegistered", new { patientId, patientName });
    }

    /// <summary>
    /// Broadcast: Patient assigned to room (reception + dashboard)
    /// </summary>
    public static async Task BroadcastPatientAssigned(
        IHubContext<WaitingRoomHub> hub,
        string patientId,
        string consultingRoomId)
    {
        await hub.Clients.Groups("reception", "dashboard")
            .SendAsync("PatientAssigned", new { patientId, consultingRoomId });
    }

    /// <summary>
    /// Broadcast: Consulting room occupancy changed (dashboard + doctors)
    /// </summary>
    public static async Task BroadcastRoomOccupancyChanged(
        IHubContext<WaitingRoomHub> hub,
        string roomId,
        string? currentPatientId,
        string? patientName)
    {
        await hub.Clients.Groups("dashboard", $"consulting-rooms")
            .SendAsync("RoomOccupancyChanged", new 
            { 
                roomId, 
                currentPatientId, 
                patientName 
            });
    }

    /// <summary>
    /// Broadcast: Patient at cashier (cashier + dashboard)
    /// </summary>
    public static async Task BroadcastPatientAtCashier(
        IHubContext<WaitingRoomHub> hub,
        string patientId,
        string patientName,
        decimal paymentAmount)
    {
        await hub.Clients.Groups("cashier", "dashboard")
            .SendAsync("PatientAtCashier", new 
            { 
                patientId, 
                patientName, 
                paymentAmount 
            });
    }

    /// <summary>
    /// Broadcast: Payment validated (cashier + dashboard)
    /// </summary>
    public static async Task BroadcastPaymentValidated(
        IHubContext<WaitingRoomHub> hub,
        string patientId,
        string patientName)
    {
        await hub.Clients.Groups("cashier", "dashboard")
            .SendAsync("PaymentValidated", new { patientId, patientName });
    }

    /// <summary>
    /// Broadcast: Patient completed (all displays + dashboard)
    /// </summary>
    public static async Task BroadcastPatientCompleted(
        IHubContext<WaitingRoomHub> hub,
        string patientId,
        string patientName)
    {
        await hub.Clients.Groups("waiting-room-display", "dashboard", "reception", "cashier")
            .SendAsync("PatientCompleted", new { patientId, patientName });
    }

    /// <summary>
    /// On-demand: Request full waiting room state (for new connections)
    /// </summary>
    public async Task RequestWaitingRoomState()
    {
        try
        {
            var query = new GetWaitingPatientsQuery();
            var waitingPatients = await _mediator.Send(query);

            await Clients.Caller.SendAsync("WaitingRoomState", waitingPatients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching waiting room state");
            await Clients.Caller.SendAsync("Error", "Failed to fetch waiting room state");
        }
    }

    /// <summary>
    /// On-demand: Request consulting room occupancy (for dashboard)
    /// </summary>
    public async Task RequestConsultingRoomOccupancy()
    {
        try
        {
            var query = new GetConsultingRoomOccupancyQuery();
            var occupancy = await _mediator.Send(query);

            await Clients.Caller.SendAsync("ConsultingRoomOccupancy", occupancy);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching consulting room occupancy");
            await Clients.Caller.SendAsync("Error", "Failed to fetch occupancy");
        }
    }
}
```

### 2.5 EventPublisher Integration

```csharp
namespace WaitingRoom.Infrastructure.Messaging;

using Microsoft.AspNetCore.SignalR;
using WaitingRoom.API.Hubs;
using WaitingRoom.Domain.Events;
using BuildingBlocks.EventSourcing;

/// <summary>
/// Event Publisher: Coordinates event publishing to both Outbox + SignalR
/// Acts as a bridge between domain events and real-time notifications
/// </summary>
public sealed class EventPublisher : IEventPublisher
{
    private readonly IHubContext<WaitingRoomHub> _hubContext;
    private readonly ILogger<EventPublisher> _logger;

    public EventPublisher(IHubContext<WaitingRoomHub> hubContext, ILogger<EventPublisher> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task PublishAsync(
        IReadOnlyList<DomainEvent> domainEvents,
        CancellationToken cancellationToken = default)
    {
        foreach (var @event in domainEvents)
        {
            try
            {
                await PublishEventAsync(@event, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing event {@Event}", @event);
                throw;
            }
        }
    }

    private async Task PublishEventAsync(DomainEvent @event, CancellationToken cancellationToken)
    {
        // Events are already persisted in Event Store by command handler
        // This publishes to SignalR for real-time updates

        switch (@event)
        {
            case PatientRegistered patientRegistered:
                await WaitingRoomHub.BroadcastPatientRegistered(
                    _hubContext,
                    patientRegistered.PatientId,
                    patientRegistered.PatientName);
                break;

            case PatientConsultingRoomAssigned roomAssigned:
                await WaitingRoomHub.BroadcastPatientAssigned(
                    _hubContext,
                    roomAssigned.PatientId,
                    roomAssigned.ConsultingRoomId);
                break;

            case PatientConsultationStarted consulationStarted:
                await WaitingRoomHub.BroadcastRoomOccupancyChanged(
                    _hubContext,
                    consulationStarted.ConsultingRoomId,
                    consulationStarted.PatientId,
                    null); // Fetch name from projection
                break;

            case PatientConsultationFinished consultationFinished:
                await WaitingRoomHub.BroadcastRoomOccupancyChanged(
                    _hubContext,
                    consultationFinished.ConsultingRoomId,
                    null,
                    null);
                break;

            case PatientArrivedAtCashier arrivedAtCashier:
                await WaitingRoomHub.BroadcastPatientAtCashier(
                    _hubContext,
                    arrivedAtCashier.PatientId,
                    "", // Get from projection
                    arrivedAtCashier.PaymentAmount);
                break;

            case PatientPaymentValidated paymentValidated:
                await WaitingRoomHub.BroadcastPaymentValidated(
                    _hubContext,
                    paymentValidated.PatientId,
                    ""); // Get from projection
                break;

            case PatientCompleted completed:
                await WaitingRoomHub.BroadcastPatientCompleted(
                    _hubContext,
                    completed.PatientId,
                    ""); // Get from projection
                break;
        }
    }
}
```

---

## Fase 3: Frontend Next.js Refactorizado {#fase-3}

### 3.1 Nueva Estructura de Rutas (Sin nuevas pantallas)

```
apps/frontend/src/app/
├── registration/            ← REUTILIZAR (public patient registration)
│   └── page.tsx
├── dashboard/               ← EXISTENTE (admin overview)
│   └── page.tsx
├── reception/               ← REFACTORIZAR (patient assignment)
│   └── page.tsx
├── medical/                 ← REFACTORIZAR (doctor consultation)
│   └── page.tsx
├── cashier/                 ← REFACTORIZAR (payment validation)
│   └── page.tsx
├── display/                 ← REUTILIZAR (public waiting room display)
│   └── page.tsx
└── consulting-rooms/        ← REFACTORIZAR (room management - admin only)
    └── page.tsx
```

**Regla crítica:** NO crear nuevas pantallas. Adaptar las existentes.

### 3.2 Componentes y Hooks Refactorizados

```typescript
// ===== src/domain/patient/PatientState.ts
export enum PatientState {
  Registered = "REGISTERED",
  Waiting = "WAITING",
  Assigned = "ASSIGNED",
  InConsultation = "IN_CONSULTATION",
  FinishedConsultation = "FINISHED_CONSULTATION",
  AtCashier = "AT_CASHIER",
  PaymentValidated = "PAYMENT_VALIDATED",
  Completed = "COMPLETED",
  AbsentAtConsultation = "ABSENT_AT_CONSULTATION",
  AbsentAtCashier = "ABSENT_AT_CASHIER",
  CancelledByPayment = "CANCELLED_BY_PAYMENT",
}

export interface Patient {
  patientId: string;
  patientIdentity: string;    // cedula
  patientName: string;
  currentState: PatientState;
  assignedRoomId?: string;
  paymentAmount?: number;
  waitingStartedAt?: string;   // ISO 8601
  consultationStartedAt?: string;
  paymentValidatedAt?: string;
  completedAt?: string;
}

// ===== src/hooks/usePatientState.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/services/api/client";
import { Patient, PatientState } from "@/domain/patient/PatientState";

export function usePatientState(patientId: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch patient state from backend
  const fetchPatientState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/patients/${patientId}/state`);
      setPatient(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Subscribe to real-time updates via SignalR
  useEffect(() => {
    fetchPatientState();

    // SignalR subscription (if patient state changes)
    // This will be handled by the hub integration
    const timer = setInterval(fetchPatientState, 5000); // Poll every 5s as fallback

    return () => clearInterval(timer);
  }, [fetchPatientState]);

  return { patient, loading, error, refetch: fetchPatientState };
}

// ===== src/hooks/useWaitingPatients.ts
import { useState, useEffect } from "react";
import { apiClient } from "@/services/api/client";

export interface PatientSummary {
  patientId: string;
  patientIdentity: string;
  patientName: string;
  waitingTime: string; // Duration string
}

export function useWaitingPatients() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchWaitingPatients = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/patients/waiting");
        setPatients(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchWaitingPatients();
    const timer = setInterval(fetchWaitingPatients, 3000); // Refresh every 3s

    return () => clearInterval(timer);
  }, []);

  return { patients, loading, error };
}

// ===== src/hooks/useConsultingRoomOccupancy.ts
import { useState, useEffect } from "react";
import { apiClient } from "@/services/api/client";

export interface RoomDetail {
  roomId: string;
  roomName: string;
  isActive: boolean;
  currentPatientId?: string;
  patientName?: string;
  occupancyTime?: string;
}

export interface ConsultingRoomOccupancy {
  totalRooms: number;
  activeRooms: number;
  occupiedRooms: number;
  roomDetails: RoomDetail[];
}

export function useConsultingRoomOccupancy() {
  const [occupancy, setOccupancy] = useState<ConsultingRoomOccupancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOccupancy = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/consulting-rooms/occupancy");
        setOccupancy(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancy();
    const timer = setInterval(fetchOccupancy, 2000); // Refresh every 2s

    return () => clearInterval(timer);
  }, []);

  return { occupancy, loading, error };
}
```

### 3.3 Componentes UI Refactorizados

```typescript
// ===== src/components/reception/PatientAssignment.tsx
import React, { useState } from "react";
import { useWaitingPatients } from "@/hooks/useWaitingPatients";
import { useConsultingRoomOccupancy } from "@/hooks/useConsultingRoomOccupancy";
import { apiClient } from "@/services/api/client";
import styles from "./PatientAssignment.module.css";

interface PatientAssignmentProps {
  onPatientSelected?: (patientId: string) => void;
}

export function PatientAssignment({ onPatientSelected }: PatientAssignmentProps) {
  const { patients, loading: patientsLoading } = useWaitingPatients();
  const { occupancy, loading: occupancyLoading } = useConsultingRoomOccupancy();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const handlePatientClick = (patientId: string) => {
    setSelectedPatient(patientId);
    onPatientSelected?.(patientId);
  };

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId);
  };

  const handleAssign = async () => {
    if (!selectedPatient || !selectedRoom) {
      alert("Please select both a patient and a room");
      return;
    }

    try {
      setAssigning(true);
      await apiClient.post(`/api/patients/${selectedPatient}/assign-room`, {
        consultingRoomId: selectedRoom,
        actor: "Receptionist",
        idempotencyKey: `assign-${selectedPatient}-${selectedRoom}-${Date.now()}`,
      });

      alert("Patient assigned successfully");
      setSelectedPatient(null);
      setSelectedRoom(null);
    } catch (error) {
      alert(`Error assigning patient: ${error}`);
    } finally {
      setAssigning(false);
    }
  };

  if (patientsLoading || occupancyLoading) {
    return <div className={styles.loading}>Loading patient list and room status...</div>;
  }

  const availableRooms = occupancy?.roomDetails.filter(
    (r) => r.isActive && !r.currentPatientId
  ) ?? [];

  return (
    <div className={styles.container}>
      <section className={styles.patientsSection}>
        <h2>Waiting Patients ({patients.length})</h2>
        <div className={styles.patientsList}>
          {patients.length === 0 ? (
            <div className={styles.empty}>No patients waiting</div>
          ) : (
            patients.map((p) => (
              <div
                key={p.patientId}
                className={`${styles.patientItem} ${
                  selectedPatient === p.patientId ? styles.selected : ""
                }`}
                onClick={() => handlePatientClick(p.patientId)}
              >
                <div className={styles.patientIdentity}>{p.patientIdentity}</div>
                <div className={styles.patientName}>{p.patientName}</div>
                <div className={styles.waitingTime}>
                  Waiting: {p.waitingTime}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.roomsSection}>
        <h2>Available Rooms ({availableRooms.length})</h2>
        <div className={styles.roomsList}>
          {availableRooms.length === 0 ? (
            <div className={styles.empty}>No rooms available</div>
          ) : (
            availableRooms.map((r) => (
              <div
                key={r.roomId}
                className={`${styles.roomItem} ${
                  selectedRoom === r.roomId ? styles.selected : ""
                }`}
                onClick={() => handleRoomClick(r.roomId)}
              >
                <div className={styles.roomId}>{r.roomId}</div>
                <div className={styles.roomName}>{r.roomName}</div>
                <div className={styles.roomStatus}>Available</div>
              </div>
            ))
          )}
        </div>
      </section>

      <button
        className={styles.assignButton}
        onClick={handleAssign}
        disabled={!selectedPatient || !selectedRoom || assigning}
      >
        {assigning ? "Assigning..." : "Assign Patient to Room"}
      </button>
    </div>
  );
}

// ===== src/components/cashier/CashierQueue.tsx
import React, { useState } from "react";
import { apiClient } from "@/services/api/client";
import styles from "./CashierQueue.module.css";

export interface CashierQueueItem {
  patientId: string;
  patientIdentity: string;
  patientName: string;
  paymentAmount: number;
  waitingTime: string;
  paymentAttempts: number;
}

interface CashierQueueProps {
  patients: CashierQueueItem[];
  onPatientSelected?: (patient: CashierQueueItem) => void;
}

export function CashierQueue({ patients, onPatientSelected }: CashierQueueProps) {
  const [validatingPatient, setValidatingPatient] = useState<string | null>(null);

  const handleValidatePayment = async (patientId: string) => {
    try {
      setValidatingPatient(patientId);
      await apiClient.post(`/api/patients/${patientId}/validate-payment`, {
        actor: "Cashier",
        idempotencyKey: `payment-${patientId}-${Date.now()}`,
      });

      alert("Payment validated successfully");
    } catch (error) {
      alert(`Error validating payment: ${error}`);
    } finally {
      setValidatingPatient(null);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Cashier Queue ({patients.length})</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Identity</th>
            <th>Patient Name</th>
            <th>Payment Amount</th>
            <th>Waiting Time</th>
            <th>Attempts</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.patientId} onClick={() => onPatientSelected?.(p)}>
              <td>{p.patientIdentity}</td>
              <td>{p.patientName}</td>
              <td>${p.paymentAmount.toFixed(2)}</td>
              <td>{p.waitingTime}</td>
              <td>{p.paymentAttempts}</td>
              <td>
                <button
                  onClick={() => handleValidatePayment(p.patientId)}
                  disabled={validatingPatient === p.patientId}
                >
                  {validatingPatient === p.patientId ? "Processing..." : "Validate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 3.4 Páginas Refactorizadas

```typescript
// ===== src/app/reception/page.tsx
import React, { useState } from "react";
import { PatientAssignment } from "@/components/reception/PatientAssignment";
import { PatientDetailForm } from "@/components/reception/PatientDetailForm";

export default function ReceptionPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  return (
    <div className="reception-page">
      <h1>Reception - Patient Assignment</h1>
      <div className="content-grid">
        <div className="left-panel">
          <PatientAssignment onPatientSelected={setSelectedPatientId} />
        </div>
        <div className="right-panel">
          {selectedPatientId ? (
            <PatientDetailForm patientId={selectedPatientId} />
          ) : (
            <div className="empty-state">Select a patient to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== src/app/cashier/page.tsx
import React, { useState, useEffect } from "react";
import { CashierQueue, CashierQueueItem } from "@/components/cashier/CashierQueue";
import { apiClient } from "@/services/api/client";

export default function CashierPage() {
  const [cashierQueue, setCashierQueue] = useState<CashierQueueItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<CashierQueueItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCashierQueue = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/patients/cashier-queue");
        setCashierQueue(response.data);
      } catch (error) {
        console.error("Error fetching cashier queue:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCashierQueue();
    const timer = setInterval(fetchCashierQueue, 3000);

    return () => clearInterval(timer);
  }, []);

  if (loading && cashierQueue.length === 0) {
    return <div>Loading cashier queue...</div>;
  }

  return (
    <div className="cashier-page">
      <h1>Cashier - Payment Processing</h1>
      <div className="content-grid">
        <div className="left-panel">
          <CashierQueue
            patients={cashierQueue}
            onPatientSelected={setSelectedPatient}
          />
        </div>
        {selectedPatient && (
          <div className="right-panel">
            <div className="patient-payment-form">
              <h2>Payment Details</h2>
              <div className="form-group">
                <label>Identity</label>
                <input
                  type="text"
                  value={selectedPatient.patientIdentity}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={selectedPatient.patientName}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Payment Amount</label>
                <input
                  type="number"
                  value={selectedPatient.paymentAmount}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Attempts</label>
                <input
                  type="number"
                  value={selectedPatient.paymentAttempts}
                  readOnly
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== src/app/medical/page.tsx
import React, { useState, useEffect } from "react";
import { useConsultingRoomOccupancy } from "@/hooks/useConsultingRoomOccupancy";
import { apiClient } from "@/services/api/client";

export default function MedicalPage() {
  const { occupancy, loading } = useConsultingRoomOccupancy();
  const [startingConsultation, setStartingConsultation] = useState<string | null>(null);

  const handleStartConsultation = async (patientId: string) => {
    try {
      setStartingConsultation(patientId);
      await apiClient.post(`/api/patients/${patientId}/start-consultation`, {
        actor: "Doctor",
        idempotencyKey: `start-${patientId}-${Date.now()}`,
      });
      alert("Consultation started");
    } catch (error) {
      alert(`Error starting consultation: ${error}`);
    } finally {
      setStartingConsultation(null);
    }
  };

  const handleFinishConsultation = async (patientId: string) => {
    try {
      setStartingConsultation(patientId);
      await apiClient.post(`/api/patients/${patientId}/finish-consultation`, {
        actor: "Doctor",
        notes: "Consultation completed",
        idempotencyKey: `finish-${patientId}-${Date.now()}`,
      });
      alert("Consultation finished");
    } catch (error) {
      alert(`Error finishing consultation: ${error}`);
    } finally {
      setStartingConsultation(null);
    }
  };

  if (loading) return <div>Loading room status...</div>;

  return (
    <div className="medical-page">
      <h1>Medical - Consulting Rooms</h1>
      <div className="rooms-grid">
        {occupancy?.roomDetails.map((room) => (
          <div key={room.roomId} className={`room-card ${!room.isActive ? 'inactive' : ''}`}>
            <h3>{room.roomId}</h3>
            <p>{room.roomName}</p>
            <div className={`status ${room.currentPatientId ? 'occupied' : 'available'}`}>
              {room.currentPatientId ? (
                <>
                  <p>Patient: {room.patientName}</p>
                  <button
                    onClick={() => handleFinishConsultation(room.currentPatientId!)}
                    disabled={startingConsultation === room.currentPatientId}
                  >
                    {startingConsultation === room.currentPatientId ? "Processing..." : "Finish"}
                  </button>
                </>
              ) : (
                <>
                  <p>Available</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== src/app/display/page.tsx (Public waiting room display)
import React, { useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";

interface WaitingDisplay {
  patientIdentity: string;
  displayName: string;
  state: string;
  waitingPosition: number;
  waitingTimeMinutes: number;
}

export default function DisplayPage() {
  const [patients, setPatients] = useState<WaitingDisplay[]>([]);

  useEffect(() => {
    const fetchDisplay = async () => {
      try {
        const response = await apiClient.get("/api/patients/waiting-room-display");
        setPatients(response.data);
      } catch (error) {
        console.error("Error fetching display:", error);
      }
    };

    fetchDisplay();
    const timer = setInterval(fetchDisplay, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="display-page">
      <h1>Waiting Room - Current Status</h1>
      <div className="display-grid">
        {patients.map((p, idx) => (
          <div key={p.patientIdentity} className="patient-display-card">
            <div className="position">{p.waitingPosition}</div>
            <div className="name">{p.displayName}</div>
            <div className="wait-time">Waiting {p.waitingTimeMinutes} minutes</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Fase 4: Testing Strategy {#fase-4}

### 4.1 Backend Tests (xUnit + NUnit)

```csharp
// ===== Tests/WaitingRoom.Tests.Domain/Aggregates/PatientAggregateTests.cs

namespace WaitingRoom.Tests.Domain.Aggregates;

using Xunit;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Domain.Events;
using WaitingRoom.Domain.Exceptions;
using BuildingBlocks.EventSourcing;

public sealed class PatientAggregateTests
{
    private readonly DateTime _testTime = DateTime.UtcNow;

    [Fact]
    public void Create_ValidInput_RaisesPatientRegisteredEvent()
    {
        // Arrange
        var patientId = Guid.NewGuid().ToString();
        var identity = new PatientIdentity("12345678");
        var name = "John Doe";
        var metadata = new EventMetadata
        {
            OccurredAt = _testTime,
            CorrelationId = "corr-123",
            CausationId = "caus-123",
            Actor = "Patient",
            IdempotencyKey = "idem-123",
            SchemaVersion = 1
        };

        // Act
        var patient = Patient.Create(patientId, identity, name, "555-1234", metadata);

        // Assert
        Assert.NotNull(patient);
        Assert.Equal(patientId, patient.Id);
        Assert.Equal("John Doe", patient.PatientName);
        Assert.Equal(PatientState.Registered, patient.CurrentState);

        var @event = patient.GetDomainEvents().FirstOrDefault() as PatientRegistered;
        Assert.NotNull(@event);
        Assert.Equal(patientId, @event.PatientId);
    }

    [Fact]
    public void MarkAsWaiting_FromRegisteredState_TransitionsToWaiting()
    {
        // Arrange
        var patient = CreatePatientInRegisteredState();

        // Act
        patient.MarkAsWaiting(new MarkPatientAsWaitingRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _testTime,
                CorrelationId = "corr-456",
                CausationId = "caus-456",
                Actor = "Receptionist",
                IdempotencyKey = "idem-456",
                SchemaVersion = 1
            },
            OccurredAt = _testTime
        });

        // Assert
        Assert.Equal(PatientState.Waiting, patient.CurrentState);
        Assert.NotNull(patient.WaitingStartedAt);
    }

    [Fact]
    public void AssignConsultingRoom_FromWaitingState_TransitionsToAssigned()
    {
        // Arrange
        var patient = CreatePatientInWaitingState();
        var roomId = "ROOM-001";

        // Act
        patient.AssignConsultingRoom(new AssignConsultingRoomRequest
        {
            Metadata = new EventMetadata
            {
                OccurredAt = _testTime,
                CorrelationId = "corr-789",
                CausationId = "caus-789",
                Actor = "Receptionist",
                IdempotencyKey = "idem-789",
                SchemaVersion = 1
            },
            ConsultingRoomId = roomId,
            IsRoomActive = true,
            OccurredAt = _testTime
        });

        // Assert
        Assert.Equal(PatientState.Assigned, patient.CurrentState);
        Assert.Equal(roomId, patient.AssignedConsultingRoomId);
    }

    [Fact]
    public void AssignConsultingRoom_FromInactiveRoom_ThrowsDomainException()
    {
        // Arrange
        var patient = CreatePatientInWaitingState();

        // Act & Assert
        var ex = Assert.Throws<DomainException>(() =>
        {
            patient.AssignConsultingRoom(new AssignConsultingRoomRequest
            {
                Metadata = new EventMetadata
                {
                    OccurredAt = _testTime,
                    CorrelationId = "corr-999",
                    CausationId = "caus-999",
                    Actor = "Receptionist",
                    IdempotencyKey = "idem-999",
                    SchemaVersion = 1
                },
                ConsultingRoomId = "ROOM-INACTIVE",
                IsRoomActive = false,
                OccurredAt = _testTime
            });
        });

        Assert.Contains("not active", ex.Message);
    }

    [Fact]
    public void CompleteFlowFromRegistrationToCashier_Success()
    {
        // Arrange & Act
        var patient = CreatePatientInRegisteredState();

        // Transition: REGISTERED → WAITING
        patient.MarkAsWaiting(CreateMetadata());

        // Transition: WAITING → ASSIGNED
        patient.AssignConsultingRoom(new AssignConsultingRoomRequest
        {
            Metadata = CreateMetadata(),
            ConsultingRoomId = "ROOM-001",
            IsRoomActive = true,
            OccurredAt = _testTime
        });

        // Transition: ASSIGNED → IN_CONSULTATION
        patient.StartConsultation(new StartConsultationRequest
        {
            Metadata = CreateMetadata(),
            OccurredAt = _testTime
        });

        // Transition: IN_CONSULTATION → FINISHED_CONSULTATION
        patient.FinishConsultation(new FinishConsultationRequest
        {
            Metadata = CreateMetadata(),
            OccurredAt = _testTime,
            Notes = "Completed"
        });

        // Transition: FINISHED_CONSULTATION → AT_CASHIER
        patient.ArriveCashier(new ArriveCashierRequest
        {
            Metadata = CreateMetadata(),
            OccurredAt = _testTime,
            GeneratedPaymentAmount = 250
        });

        // Transition: AT_CASHIER → PAYMENT_VALIDATED
        patient.ValidatePayment(new ValidatePaymentRequest
        {
            Metadata = CreateMetadata(),
            OccurredAt = _testTime
        });

        // Transition: PAYMENT_VALIDATED → COMPLETED
        patient.Complete(new CompletePatientRequest
        {
            Metadata = CreateMetadata(),
            OccurredAt = _testTime
        });

        // Assert
        Assert.Equal(PatientState.Completed, patient.CurrentState);
        Assert.NotNull(patient.CompletedAt);
    }

    // Helper methods
    private Patient CreatePatientInRegisteredState()
    {
        var patientId = Guid.NewGuid().ToString();
        return Patient.Create(
            patientId,
            new PatientIdentity("12345678"),
            "John Doe",
            "555-1234",
            CreateMetadata());
    }

    private Patient CreatePatientInWaitingState()
    {
        var patient = CreatePatientInRegisteredState();
        patient.MarkAsWaiting(new MarkPatientAsWaitingRequest
        {
            Metadata = CreateMetadata(),
            OccurredAt = _testTime
        });
        return patient;
    }

    private EventMetadata CreateMetadata()
    {
        return new EventMetadata
        {
            OccurredAt = _testTime,
            CorrelationId = Guid.NewGuid().ToString(),
            CausationId = Guid.NewGuid().ToString(),
            Actor = "Receptionist",
            IdempotencyKey = Guid.NewGuid().ToString(),
            SchemaVersion = 1
        };
    }
}
```

### 4.2 Integration Tests

```csharp
// ===== Tests/WaitingRoom.Tests.Integration/PatientCommandHandlerIntegrationTests.cs

namespace WaitingRoom.Tests.Integration;

using Xunit;
using WaitingRoom.Application.CommandHandlers;
using WaitingRoom.Application.Commands;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Infrastructure.Persistence;

[Collection("Database")]
public sealed class PatientCommandHandlerIntegrationTests : IAsyncLifetime
{
    private readonly IntegrationTestFixture _fixture;

    public PatientCommandHandlerIntegrationTests()
    {
        _fixture = new IntegrationTestFixture();
    }

    public async Task InitializeAsync()
    {
        await _fixture.InitializeAsync();
    }

    public async Task DisposeAsync()
    {
        await _fixture.DisposeAsync();
    }

    [Fact]
    public async Task RegisterPatient_ValidInput_PersistsToDatabaseAndProjection()
    {
        // Arrange
        var handler = _fixture.CreateCommandHandler<RegisterPatientCommandHandler>();
        var command = new RegisterPatientCommand
        {
            PatientIdentity = "87654321",
            PatientName = "Jane Smith",
            PhoneNumber = "555-5678",
            IdempotencyKey = Guid.NewGuid().ToString()
        };

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result.PatientId);
        Assert.True(result.Success);

        // Verify event persisted
        var @event = await _fixture.EventStore.GetEventsAsync(result.PatientId);
        Assert.NotEmpty(@event);
        Assert.Equal("PatientRegistered", @event.First().EventName);

        // Verify projection updated
        var projection = await _fixture.PatientStateRepository.GetByIdAsync(
            result.PatientId,
            CancellationToken.None);
        Assert.NotNull(projection);
        Assert.Equal("Jane Smith", projection.PatientName);
    }

    [Fact]
    public async Task CompletePatientFlow_EndToEnd_SuccessfullyTransitionsAllStates()
    {
        // Arrange
        var registerHandler = _fixture.CreateCommandHandler<RegisterPatientCommandHandler>();
        var waitingHandler = _fixture.CreateCommandHandler<MarkPatientAsWaitingCommandHandler>();
        var assignHandler = _fixture.CreateCommandHandler<AssignConsultingRoomCommandHandler>();
        // ... other handlers

        // Act 1: Register
        var registerResult = await registerHandler.Handle(
            new RegisterPatientCommand
            {
                PatientIdentity = "11111111",
                PatientName = "Complete Flow Test",
                IdempotencyKey = Guid.NewGuid().ToString()
            },
            CancellationToken.None);

        var patientId = registerResult.PatientId;

        // Act 2: Mark as Waiting
        await waitingHandler.Handle(
            new MarkPatientAsWaitingCommand { PatientId = patientId, Actor = "Receptionist" },
            CancellationToken.None);

        // Act 3: Assign Room
        await assignHandler.Handle(
            new AssignConsultingRoomCommand
            {
                PatientId = patientId,
                ConsultingRoomId = "ROOM-001",
                Actor = "Receptionist"
            },
            CancellationToken.None);

        // ... continue with start, finish, cashier, complete

        // Assert: All events persisted properly
        var events = await _fixture.EventStore.GetEventsAsync(patientId);
        Assert.NotEmpty(events);
        Assert.Contains(events, e => e.EventName == "PatientRegistered");
        Assert.Contains(events, e => e.EventName == "PatientMarkedAsWaiting");
        Assert.Contains(events, e => e.EventName == "PatientConsultingRoomAssigned");
    }

    [Fact]
    public async Task IdempotencyKey_DuplicateCommand_ReturnsIdempotentResponse()
    {
        // Arrange
        var idempotencyKey = Guid.NewGuid().ToString();
        var handler = _fixture.CreateCommandHandler<RegisterPatientCommandHandler>();
        var command = new RegisterPatientCommand
        {
            PatientIdentity = "22222222",
            PatientName = "Idempotency Test",
            IdempotencyKey = idempotencyKey
        };

        // Act: First call
        var result1 = await handler.Handle(command, CancellationToken.None);

        // Act: Second call with same idempotency key
        var result2 = await handler.Handle(command, CancellationToken.None);

        // Assert: Both return same result (idempotent)
        Assert.Equal(result1.PatientId, result2.PatientId);

        // Verify only one event in store
        var events = await _fixture.EventStore.GetEventsAsync(result1.PatientId);
        Assert.Single(events);
    }
}
```

### 4.3 Frontend Tests (Jest + React Testing Library)

```typescript
// ===== test/components/reception/PatientAssignment.test.tsx

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PatientAssignment } from "@/components/reception/PatientAssignment";
import { apiClient } from "@/services/api/client";

jest.mock("@/services/api/client");

describe("PatientAssignment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render waiting patients list", async () => {
    // Arrange
    const mockPatients = [
      {
        patientId: "p-001",
        patientIdentity: "12345678",
        patientName: "John Doe",
        waitingTime: "00:05:30",
      },
      {
        patientId: "p-002",
        patientIdentity: "87654321",
        patientName: "Jane Smith",
        waitingTime: "00:02:15",
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockPatients,
    });

    // Act
    render(<PatientAssignment />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  it("should render available consulting rooms", async () => {
    // Arrange
    const mockRooms = {
      totalRooms: 3,
      activeRooms: 3,
      occupiedRooms: 1,
      roomDetails: [
        {
          roomId: "ROOM-001",
          roomName: "Dr. Garcia",
          isActive: true,
          currentPatientId: undefined,
        },
        {
          roomId: "ROOM-002",
          roomName: "Dr. Lopez",
          isActive: true,
          currentPatientId: "p-001",
        },
        {
          roomId: "ROOM-003",
          roomName: "Dr. Martinez",
          isActive: false,
          currentPatientId: undefined,
        },
      ],
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [] }); // patients
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockRooms }); // occupancy

    // Act
    render(<PatientAssignment />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("ROOM-001")).toBeInTheDocument();
      expect(screen.getByText("Available")).toBeInTheDocument();
    });
  });

  it("should assign patient to room on click", async () => {
    // Arrange
    const mockPatients = [
      {
        patientId: "p-001",
        patientIdentity: "12345678",
        patientName: "John Doe",
        waitingTime: "00:05:30",
      },
    ];

    const mockRooms = {
      totalRooms: 1,
      activeRooms: 1,
      occupiedRooms: 0,
      roomDetails: [
        {
          roomId: "ROOM-001",
          roomName: "Dr. Garcia",
          isActive: true,
          currentPatientId: undefined,
        },
      ],
    };

    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockPatients })
      .mockResolvedValueOnce({ data: mockRooms });

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ success: true });

    // Act
    render(<PatientAssignment />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const patientItem = screen.getByText("John Doe").closest("div");
    fireEvent.click(patientItem!);

    const roomItem = screen.getByText("ROOM-001").closest("div");
    fireEvent.click(roomItem!);

    const assignButton = screen.getByText("Assign Patient to Room");
    fireEvent.click(assignButton);

    // Assert
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/patients/"),
        expect.objectContaining({
          consultingRoomId: "ROOM-001",
        })
      );
    });
  });
});

// ===== test/hooks/usePatientState.test.ts

import { renderHook, waitFor } from "@testing-library/react";
import { usePatientState } from "@/hooks/usePatientState";
import { apiClient } from "@/services/api/client";

jest.mock("@/services/api/client");

describe("usePatientState", () => {
  it("should fetch patient state on mount", async () => {
    // Arrange
    const mockPatient = {
      patientId: "p-001",
      patientIdentity: "12345678",
      patientName: "John Doe",
      currentState: "WAITING",
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockPatient,
    });

    // Act
    const { result } = renderHook(() => usePatientState("p-001"));

    // Assert
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.patient).toEqual(mockPatient);
    });
  });

  it("should refetch patient state when refetch is called", async () => {
    // Arrange
    const mockPatient1 = {
      patientId: "p-001",
      currentState: "WAITING",
    };
    const mockPatient2 = {
      patientId: "p-001",
      currentState: "IN_CONSULTATION",
    };

    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockPatient1 })
      .mockResolvedValueOnce({ data: mockPatient2 });

    // Act
    const { result } = renderHook(() => usePatientState("p-001"));

    await waitFor(() => {
      expect(result.current.patient?.currentState).toBe("WAITING");
    });

    result.current.refetch();

    // Assert
    await waitFor(() => {
      expect(result.current.patient?.currentState).toBe("IN_CONSULTATION");
    });
  });
});
```

### 4.4 E2E Tests (Cypress)

```typescript
// ===== test/e2e/patient-complete-flow.cy.ts

describe("Patient Complete Flow", () => {
  beforeEach(() => {
    cy.login("receptionist", "password");
    cy.visit("/reception");
  });

  it("should complete full patient journey from registration to completion", () => {
    // Step 1: Public Registration
    cy.visit("/registration");
    cy.get("input[name='patientIdentity']").type("12345678");
    cy.get("input[name='patientName']").type("Integration Test Patient");
    cy.get("input[name='phoneNumber']").type("555-1234");
    cy.get("button:contains('Register')").click();
    cy.contains("Patient registered successfully").should("be.visible");

    cy.intercept("GET", "/api/patients/waiting").as("getWaitingPatients");

    // Step 2: Reception - Assign Patient to Room
    cy.visit("/reception");
    cy.wait("@getWaitingPatients");
    cy.contains("Integration Test Patient").click();
    cy.get("[data-testid='room-ROOM-001']").click();
    cy.get("button:contains('Assign Patient to Room')").click();
    cy.contains("Patient assigned successfully").should("be.visible");

    // Step 3: Doctor - Start Consultation
    cy.login("doctor", "password");
    cy.visit("/medical");
    cy.contains("Integration Test Patient").parent().contains("button", "Start").click();
    cy.contains("Consultation started").should("be.visible");

    // Step 4: Doctor - Finish Consultation
    cy.contains("button", "Finish").click();
    cy.contains("Consultation finished").should("be.visible");

    // Step 5: Cashier - Process Payment
    cy.login("cashier", "password");
    cy.visit("/cashier");
    cy.contains("Integration Test Patient").click();
    cy.get("button:contains('Validate')").click();
    cy.contains("Payment validated successfully").should("be.visible");

    // Step 6: Verify Completed
    cy.login("admin", "password");
    cy.visit("/dashboard");
    cy.contains("Completed patients: 1").should("be.visible");
  });

  it("should handle patient absence at consultation", () => {
    // ... test absence flow
  });

  it("should handle payment failure and retry", () => {
    // ... test payment failure flow
  });
});
```

---

## Fase 5: Documentación y Deploy {#fase-5}

### 5.1 ADR (Architecture Decision Records)

```markdown
# ADR-001: Patient-Centric Aggregate Root

## Status
ACCEPTED (2026-03-19)

## Context
Previously, RLAPP modeled the system around "Queue" aggregates. This created challenges:
- Tight coupling between patient and queue lifecycle
- Difficulty supporting concurrent consultations
- Inflexible flow management

## Decision
Redesigned the system with **Patient** as the primary aggregate root and **ConsultingRoom** as secondary.

## Consequences
- **Positive:**
  - Decoupled patient journey from queue mechanics
  - Support N concurrent consultations per N rooms
  - Flexible patient state management independent of other patients
  - Clear event sourcing per patient

- **Negative:**
  - Must coordinate Patient + ConsultingRoom state transitions
  - More complex queries across aggregates
  - Requires stronger eventually-consistent projections
```

### 5.2 Migration Guide

```markdown
# Migration Guide: Queue → Patient-Centric Architecture

## Pre-Migration Checklist
- [ ] Backup PostgreSQL databases
- [ ] Tag current release as `pre-refactor-backup`
- [ ] Notify all stakeholders

## Migration Steps

### Phase 1: Data Transformation
```sql
-- 1. Backup existing wairting_patients_view
CREATE TABLE waiting_patients_view_backup AS
SELECT * FROM waiting_patients_view;

-- 2. Migrate queue data to patient state view
INSERT INTO patients_state_view (
  patient_id, patient_identity, patient_name, current_state,
  created_at, last_modified_at, updated_by_event_version
)
SELECT 
  patient_id,
  patient_id as patient_identity,  -- TODO: map properly
  patient_name,
  'Registered' as current_state,    -- Default state
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  1
FROM waiting_patients_view_backup
WHERE patient_id IS NOT NULL;
```

### Phase 2: Event Store Migration
- Use event replay tool to rebuild aggregates from existing events
- Map old `queueId` events to new `patientId` aggregates
- Validate event sequence integrity

### Phase 3: Projection Rebuild
- Trigger projection rebuild for all read models
- Verify counts match source data
- Monitor lag metrics

### Phase 4: Validation & Rollback Plan
- Run comprehensive integration tests
- Verify critical paths (registration → cashier)
- Keep rollback script ready (restore from backup)

## Post-Migration
- Monitor event processing lag
- Monitor projection rebuild progress
- Validate business metrics (patient throughput, wait times)
- Archive old schema

---

## Deployment Strategy

### Canary Deployment (15% → 50% → 100%)
1. Deploy to 15% of instances
   - Monitor: event lag, error rates, latency
   - Duration: 1 hour
   
2. Deploy to 50% of instances
   - Monitor: same metrics
   - Duration: 2 hours
   
3. Deploy to 100% of instances (if metrics pass)

### Rollback Criteria
- Event lag > 5 seconds
- Error rate > 2%
- P95 latency > 2 seconds
- Critical business paths failing

### Monitoring Dashboard
- Event processing lag by aggregate type
- Command handler success/failure rates
- Query response times (by endpoint)
- SignalR connection health
```

### 5.3 Updated README

```markdown
# RLAPP Backend Refactoring - Patient-Centric Architecture

> **Version 2.0** - Redesigned from Queue-centric to Patient-centric domain model

## What Changed?

### High-Level
- **Old Model**: `Queue` aggregate containing all patients and state
- **New Model**: `Patient` aggregate (primary) + `ConsultingRoom` aggregate (secondary)

### Key Benefits
✅ Concurrent multi-room consultations  
✅ Patient-first state machine  
✅ Flexible, parallelizable workflows  
✅ Clearer event sourcing semantics  

### Key Trade-offs
⚠️ Requires cross-aggregate coordination  
⚠️ More complex queries (joins across aggregates)  
⚠️ Stronger eventual consistency requirements  

## Architecture

### Domain Model
```
Patient Aggregate (Event-Sourced)
├─ PatientRegistered
├─ PatientMarkedAsWaiting
├─ PatientConsultingRoomAssigned
├─ PatientConsultationStarted
├─ PatientConsultationFinished
├─ PatientArrivedAtCashier
├─ PatientPaymentValidated
└─ PatientCompleted [or ABSENT_*, CANCELLED_*]

ConsultingRoom Aggregate (Event-Sourced)
├─ ConsultingRoomCreated (initialized as ACTIVE)
├─ ConsultingRoomActivated
├─ ConsultingRoomDeactivated
├─ ConsultingRoomPatientAssigned
└─ ConsultingRoomPatientLeft
```

### Projections (Read Models)
- `patients_state_view` — Current state of each patient
- `consulting_room_occupancy_view` — Real-time room status
- `waiting_room_display_view` — Public display data
- `cashier_queue_view` — Patients awaiting payment
- `completed_patients_view` — Historical archive

## Running

```bash
# Start all services
docker compose up -d

# Run migrations (includes new schema)
cd apps/backend
dotnet ef database update

# Run backend
dotnet watch run --project WaitingRoom.API

# Run tests
dotnet test RLAPP.slnx
```

## API Endpoints

### Patients
```
POST   /api/patients/register                    — Register (public)
POST   /api/patients/{patientId}/mark-waiting    — Mark as waiting (receptionist)
POST   /api/patients/{patientId}/assign-room     — Assign room (receptionist)
POST   /api/patients/{patientId}/start-consultation    — Start (doctor)
POST   /api/patients/{patientId}/finish-consultation   — Finish (doctor)
POST   /api/patients/{patientId}/arrive-cashier       — Arrive cashier (system)
POST   /api/patients/{patientId}/validate-payment     — Validate (cashier)
POST   /api/patients/{patientId}/complete            — Complete (system)
GET    /api/patients/{patientId}/state               — Get state (any)
GET    /api/patients/waiting                    — Get waiting (receptionist)
GET    /api/patients/cashier-queue              — Get cashier queue (cashier)
```

### Consulting Rooms
```
GET    /api/consulting-rooms/occupancy          — Get occupancy (any)
POST   /api/consulting-rooms/{roomId}/activate  — Activate (admin)
POST   /api/consulting-rooms/{roomId}/deactivate — Deactivate (admin)
```

## SignalR Connections

```typescript
// Join groups based on role
connection.on("connected", () => {
  if (role === "receptionist") {
    hub.invoke("JoinGroup", "reception");
    hub.invoke("JoinGroup", "waiting-room-display");
  } else if (role === "doctor") {
    hub.invoke("JoinGroup", "consulting-rooms");
  } else if (role === "cashier") {
    hub.invoke("JoinGroup", "cashier");
  } else if (role === "admin") {
    hub.invoke("JoinGroup", "dashboard");
  }
});

// Listen for broadcasts
hub.on("PatientAssigned", (data) => {/* update UI */});
hub.on("RoomOccupancyChanged", (data) => {/* update UI */});
hub.on("PatientAtCashier", (data) => {/* update UI */});
hub.on("PaymentValidated", (data) => {/* update UI */});
```

## Testing

```bash
# Unit tests (fast)
dotnet test WaitingRoom.Tests.Domain

# Integration tests (medium, requires DB)
dotnet test WaitingRoom.Tests.Integration

# E2E tests (slow, requires full stack)
cd apps/frontend && npx cypress run
```

## Key Invariants

### Patient
❌ Cannot be in two states simultaneously  
❌ Cannot be in consultation without an assigned room  
❌ Cannot go to cashier without finishing consultation  
✅ Can transition through terminal states (Completed, Absent)  

### ConsultingRoom
❌ Cannot be occupied by two patients  
❌ Inactive rooms cannot be assigned new patients  
✅ Can be activated/deactivated by admin  

## Monitoring

- **Event Lag**: `event_processing_lag` table
- **Projection Status**: `projection_checkpoints` table
- **Outbox Health**: `waiting_room_outbox` status counts
- **Metrics**: `/metrics` endpoint (Prometheus format)

## Troubleshooting

### Projections Out of Sync
```bash
# Rebuild from event store
curl -X POST http://localhost:5000/api/projections/rebuild
```

### Events Stuck in Outbox
```sql
SELECT * FROM waiting_room_outbox 
WHERE status = 'FAILED' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Resources
- [Event Sourcing Guide](./docs/ACID_SOURCING_PATTERNS.md)
- [CQRS Implementation](./docs/CQRS_PATTERNS.md)
- [Testing Strategy](./docs/testing/STRATEGY.md)
- [ADRs](./docs/decisions/)
```

---

## Checklist Fase 5 {#checklist-fase-5}

### Documentación
- [ ] Sistema completo de ADRs (mínimo 5)
- [ ] Migration guide detallado (con rollback)
- [ ] README actualizado con nueva arquitectura
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture diagrams (Miro/PlantUML)
- [ ] Runbook para operaciones (health checks, rebuilds, investigations)

### Deployment
- [ ] CI/CD pipeline actualizado
- [ ] Database migration scripts validados
- [ ] Canary deployment plan
- [ ] Monitoring setup (Prometheus + Grafana)
- [ ] Alerting rules configuradas
- [ ] Logging strategy verified

### Validación Pre-Deploy
- [ ] Todos los tests pasan (unit + integration + E2E)
- [ ] Code review completado
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Stakeholder sign-off

### Post-Deploy
- [ ] Canary 15% successful
- [ ] Canary 50% successful
- [ ] Full 100% deployment
- [ ] Metrics validated
- [ ] Old schema archived (kept for 30 days)
- [ ] Runbook reviewed con ops team

---

## Resumen de Cambios por Capa

| Capa | Cambio Principal | Impacto |
|------|-----------------|--------|
| **Domain** | Patient + ConsultingRoom (multi-aggregate) | ⭐⭐⭐ Alto |
| **Events** | Nuevos 12+ eventos para Patient, ConsultingRoom | ⭐⭐ Medio |
| **Database** | Nuevas proyecciones, nuevo `aggregate_type` | ⭐⭐⭐ Alto |
| **Projections** | 5 nuevas vistas (patients_state, rooms, cashier, etc.) | ⭐ Bajo |
| **API Endpoints** | 15+ nuevos endpoints refactorizados | ⭐⭐ Medio |
| **Frontend** | Componentes adaptados (sin nuevas pantallas) | ⭐ Bajo |
| **SignalR** | Grupos rediseñados por rol + patient updates | ⭐ Bajo |
| **Tests** | Cobertura extendida (nuevos escenarios) | ⭐⭐⭐ Alto |

---

**Documento generado como referencia para Fases 2-5 de refactorización de RLAPP.** 🚀

Autor: Senior Software Architect  
Última actualización: 2026-03-19
