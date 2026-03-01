using Scalar.AspNetCore;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using Serilog;
using WaitingRoom.API.Validation;
using WaitingRoom.API.Middleware;
using WaitingRoom.API.Endpoints;
using WaitingRoom.API.Hubs;
using WaitingRoom.Application.CommandHandlers;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Application.Services;
using WaitingRoom.Domain.Events;
using WaitingRoom.Infrastructure.Messaging;
using WaitingRoom.Infrastructure.Persistence.EventStore;
using WaitingRoom.Infrastructure.Persistence.Outbox;
using WaitingRoom.Infrastructure.Observability;
using WaitingRoom.Infrastructure.Projections;
using WaitingRoom.Infrastructure.Serialization;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Implementations;
using BuildingBlocks.EventSourcing;
using BuildingBlocks.Observability;
using Prometheus;

// ==============================================================================
// RLAPP — WaitingRoom.API
// Hexagonal Architecture — Presentation Layer (Adapter)
//
// Responsibilities:
// - Expose HTTP endpoints
// - Handle authentication/authorization
// - Map DTOs to Commands
// - Inject CorrelationId
// - Route to Application layer
//
// Architecture:
// - NO business logic
// - NO domain knowledge
// - Pure adapter/presenter
// - Dependency Injection composition root
// ==============================================================================

var builder = WebApplication.CreateBuilder(args);

// ==============================================================================
// LOGGING CONFIGURATION — Structured Logging with Serilog
// ==============================================================================

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

// ==============================================================================
// CONFIGURATION OPTIONS
// ==============================================================================

var connectionString = builder.Configuration.GetConnectionString("EventStore")
    ?? throw new InvalidOperationException("EventStore connection string is required");

var rabbitMqOptions = new RabbitMqOptions();
builder.Configuration.GetSection("RabbitMq").Bind(rabbitMqOptions);

// ==============================================================================
// DEPENDENCY INJECTION — Composition Root (Hexagonal Architecture)
// ==============================================================================

var services = builder.Services;

// Infrastructure — Outbox Store
services.AddSingleton<IOutboxStore>(sp => new PostgresOutboxStore(connectionString));

// Infrastructure — Lag Tracker
services.AddSingleton<IEventLagTracker>(sp => new PostgresEventLagTracker(connectionString));

// Infrastructure — Event Type Registry
services.AddSingleton<EventTypeRegistry>(sp => EventTypeRegistry.CreateDefault());

// Infrastructure — Clinical identity + queue id generation
services.AddSingleton<IPatientIdentityRegistry>(sp => new PostgresPatientIdentityRegistry(connectionString));
services.AddSingleton<IQueueIdGenerator, GuidQueueIdGenerator>();

// Infrastructure — Event Serializer
services.AddSingleton<EventSerializer>();

// Infrastructure — Event Publisher (Outbox only; Worker dispatches)
services.AddSingleton<IEventPublisher, OutboxEventPublisher>();

// Infrastructure — Event Store (PostgreSQL)
services.AddSingleton<IEventStore>(sp =>
{
    var serializer = sp.GetRequiredService<EventSerializer>();
    var outboxStore = sp.GetRequiredService<IOutboxStore>();
    var lagTracker = sp.GetRequiredService<IEventLagTracker>();
    return new PostgresEventStore(connectionString, serializer, outboxStore, lagTracker);
});

// Application — Clock
services.AddSingleton<IClock, SystemClock>();

// Application — Command Handlers
services.AddScoped<CheckInPatientCommandHandler>();
services.AddScoped<CallNextCashierCommandHandler>();
services.AddScoped<ValidatePaymentCommandHandler>();
services.AddScoped<MarkPaymentPendingCommandHandler>();
services.AddScoped<MarkAbsentAtCashierCommandHandler>();
services.AddScoped<CancelByPaymentCommandHandler>();
services.AddScoped<ActivateConsultingRoomCommandHandler>();
services.AddScoped<DeactivateConsultingRoomCommandHandler>();
services.AddScoped<ClaimNextPatientCommandHandler>();
services.AddScoped<CallPatientCommandHandler>();
services.AddScoped<CompleteAttentionCommandHandler>();
services.AddScoped<MarkAbsentAtConsultationCommandHandler>();

// Projections (in-memory context for API query runtime)
services.AddSingleton<IWaitingRoomProjectionContext, InMemoryWaitingRoomProjectionContext>();
services.AddSingleton<IProjection>(sp =>
{
    var context = sp.GetRequiredService<IWaitingRoomProjectionContext>();
    var eventStore = sp.GetRequiredService<IEventStore>();
    var logger = sp.GetRequiredService<ILogger<WaitingRoomProjectionEngine>>();
    return new WaitingRoomProjectionEngine(context, eventStore, logger);
});

// ==============================================================================
// API SERVICES
// ==============================================================================

services.AddEndpointsApiExplorer();
services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "RLAPP — WaitingRoom API",
            Version = "v1",
            Description = "API REST para gestion de sala de espera medica en tiempo real. "
                + "Arquitectura hexagonal con Event Sourcing, CQRS y Outbox Pattern. "
                + "Los comandos escriben eventos en el Event Store (PostgreSQL) y las consultas "
                + "leen proyecciones denormalizadas.",
            Contact = new OpenApiContact
            {
                Name = "Equipo RLAPP",
                Email = "soporte@rlapp.dev"
            },
            License = new OpenApiLicense
            {
                Name = "Uso interno"
            }
        };

        // // HUMAN CHECK — Ajustar los servidores segun el entorno de despliegue real
        document.Servers =
        [
            new OpenApiServer { Url = "http://localhost:5204", Description = "Desarrollo local" }
        ];

        return Task.CompletedTask;
    });
});
services.AddSignalR();

services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Health Checks
services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy())
    .AddNpgSql(connectionString, name: "postgres", tags: new[] { "db", "postgres" });

// ==============================================================================
// APPLICATION PIPELINE
// ==============================================================================

var app = builder.Build();

// Middleware Pipeline (order matters)
app.UseCorrelationId();
app.UseMiddleware<ExceptionHandlerMiddleware>();
app.UseCors("FrontendDev");

// Prometheus metrics — expone /metrics para scraping
app.UseHttpMetrics();  // Metricas automaticas de peticiones HTTP
app.MapMetrics();      // Endpoint GET /metrics

// OpenAPI schema + Scalar interactive UI
// // HUMAN CHECK — En produccion real (no Docker local), considerar restringir acceso
// a la documentacion mediante autenticacion o deshabilitar completamente.
app.MapOpenApi();  // Serve OpenAPI schema at /openapi/v1.json

app.MapScalarApiReference(options =>
{
    options
        .WithTitle("RLAPP — WaitingRoom API")
        .WithTheme(ScalarTheme.BluePlanet)
        .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
});

// Development-only tools
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// ==============================================================================
// HEALTH CHECKS ENDPOINTS
// ==============================================================================

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("self") || check.Tags.Count == 0
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => true // All checks
});

var queryGroup = app.MapGroup("/api/v1/waiting-room")
    .WithTags("Waiting Room Queries");
WaitingRoomQueryEndpoints.MapEndpoints(queryGroup);

app.MapHub<WaitingRoomHub>("/ws/waiting-room");

var commandGroup = app.MapGroup(string.Empty)
    .AddEndpointFilterFactory(RequestValidationFilter.Factory);

static async Task ProjectQueueAsync(
    IProjection projection,
    IEventStore eventStore,
    string queueId,
    CancellationToken cancellationToken)
{
    var queueEvents = await eventStore.GetEventsAsync(queueId, cancellationToken);
    await projection.ProcessEventsAsync(queueEvents, cancellationToken);
}

// ==============================================================================
// API ENDPOINTS — Minimal API Pattern
// ==============================================================================

/// <summary>
/// POST /api/waiting-room/check-in
///
/// Check in a patient to a waiting queue.
///
/// Architecture:
/// - Entry point to the system (Hexagonal Adapter)
/// - Maps DTO → Command
/// - Injects CorrelationId
/// - Delegates to Application layer (CheckInPatientCommandHandler)
/// - Returns HTTP response
///
/// Flow:
/// HTTP Request → DTO → Command → Handler → Aggregate → Events → EventStore → Response
/// </summary>
commandGroup.MapPost("/api/waiting-room/check-in", async (
    CheckInPatientDto dto,
    HttpContext httpContext,
    CheckInPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    logger.LogInformation(
        "CheckIn request received. CorrelationId: {CorrelationId}, PatientId: {PatientId}",
        correlationId,
        dto.PatientId);

    // Map DTO → Command
    var command = new CheckInPatientCommand
    {
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = dto.Priority,
        ConsultationType = dto.ConsultationType,
        Age = dto.Age,
        IsPregnant = dto.IsPregnant,
        Notes = dto.Notes,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    // Execute command via handler
    var eventCount = await handler.HandleAsync(command, cancellationToken);
    var queueId = handler.LastGeneratedQueueId;
    if (!string.IsNullOrWhiteSpace(queueId))
    {
        await ProjectQueueAsync(projection, eventStore, queueId, cancellationToken);
    }

    logger.LogInformation(
        "CheckIn completed. CorrelationId: {CorrelationId}, EventCount: {EventCount}",
        correlationId,
        eventCount);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient checked in successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        QueueId = queueId
    });
})
.WithName("CheckInPatient")
.WithTags("WaitingRoom")
.WithSummary("Registrar paciente en cola de espera")
.WithDescription("Registra un nuevo paciente en la cola de espera indicada. Genera evento PatientCheckedIn en el Event Store.")
.AddEndpointFilter<ReceptionistOnlyFilter>()
.Accepts<CheckInPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/reception/register", async (
    CheckInPatientDto dto,
    HttpContext httpContext,
    CheckInPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CheckInPatientCommand
    {
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = dto.Priority,
        ConsultationType = dto.ConsultationType,
        Age = dto.Age,
        IsPregnant = dto.IsPregnant,
        Notes = dto.Notes,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    var queueId = handler.LastGeneratedQueueId;
    if (!string.IsNullOrWhiteSpace(queueId))
    {
        await ProjectQueueAsync(projection, eventStore, queueId, cancellationToken);
    }

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient registered successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        QueueId = queueId
    });
})
.WithName("RegisterPatientReception")
.WithTags("Reception")
.WithSummary("Registrar paciente desde recepcion")
.WithDescription("Punto de entrada para recepcionistas. Registra paciente con los mismos datos que check-in pero desde el modulo de recepcion.")
.AddEndpointFilter<ReceptionistOnlyFilter>()
.Accepts<CheckInPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/call-next", async (
    CallNextCashierDto dto,
    HttpContext httpContext,
    CallNextCashierCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CallNextCashierCommand
    {
        QueueId = dto.QueueId,
        Actor = dto.Actor,
        CashierDeskId = dto.CashierDeskId,
        CorrelationId = correlationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient called at cashier successfully",
        CorrelationId = correlationId,
        EventCount = result.EventCount,
        PatientId = result.PatientId
    });
})
.WithName("CallNextCashier")
.WithTags("Cashier")
.WithSummary("Llamar siguiente paciente a caja")
.WithDescription("El cajero solicita el siguiente paciente en la cola para proceso de pago. Genera evento PatientCalledToCashier.")
.Accepts<CallNextCashierDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/validate-payment", async (
    ValidatePaymentDto dto,
    HttpContext httpContext,
    ValidatePaymentCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ValidatePaymentCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        PaymentReference = dto.PaymentReference,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Payment validated successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("ValidatePayment")
.WithTags("Cashier")
.WithSummary("Validar pago del paciente")
.WithDescription("Confirma que el paciente ha completado el pago. Genera evento PaymentValidated y avanza el flujo hacia consulta medica.")
.Accepts<ValidatePaymentDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/mark-payment-pending", async (
    MarkPaymentPendingDto dto,
    HttpContext httpContext,
    MarkPaymentPendingCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new MarkPaymentPendingCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Reason = dto.Reason,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Payment marked as pending",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("MarkPaymentPending")
.WithTags("Cashier")
.WithSummary("Marcar pago como pendiente")
.WithDescription("Indica que el paciente tiene un pago pendiente. El paciente permanece en cola pero no avanza hasta que se resuelva.")
.Accepts<MarkPaymentPendingDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/mark-absent", async (
    MarkAbsentAtCashierDto dto,
    HttpContext httpContext,
    MarkAbsentAtCashierCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new MarkAbsentAtCashierCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient marked absent at cashier",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("MarkAbsentAtCashier")
.WithTags("Cashier")
.WithSummary("Marcar paciente ausente en caja")
.WithDescription("Registra que el paciente no se presento cuando fue llamado a caja. Genera evento de ausencia.")
.Accepts<MarkAbsentAtCashierDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/cancel-payment", async (
    CancelByPaymentDto dto,
    HttpContext httpContext,
    CancelByPaymentCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CancelByPaymentCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Reason = dto.Reason,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient cancelled by payment policy",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("CancelByPayment")
.WithTags("Cashier")
.WithSummary("Cancelar atencion por politica de pago")
.WithDescription("Cancela la atencion del paciente por incumplimiento de pago. Genera evento CancelledByPayment.")
.Accepts<CancelByPaymentDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/call-next", async (
    ClaimNextPatientDto dto,
    HttpContext httpContext,
    ClaimNextPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ClaimNextPatientCommand
    {
        QueueId = dto.QueueId,
        Actor = dto.Actor,
        CorrelationId = correlationId,
        StationId = dto.StationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Next patient called for medical attention",
        CorrelationId = correlationId,
        EventCount = result.EventCount,
        PatientId = result.PatientId
    });
})
.WithName("MedicalCallNext")
.WithTags("Medical")
.WithSummary("Llamar siguiente paciente para consulta medica")
.WithDescription("El medico solicita el siguiente paciente que ya completo el pago. Genera evento PatientClaimedForConsultation.")
.Accepts<ClaimNextPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/consulting-room/activate", async (
    ActivateConsultingRoomDto dto,
    HttpContext httpContext,
    ActivateConsultingRoomCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ActivateConsultingRoomCommand
    {
        QueueId = dto.QueueId,
        ConsultingRoomId = dto.ConsultingRoomId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Consulting room activated",
        CorrelationId = correlationId,
        EventCount = eventCount,
        ConsultingRoomId = dto.ConsultingRoomId
    });
})
.WithName("ActivateConsultingRoom")
.WithTags("Medical")
.WithSummary("Activar consultorio medico")
.WithDescription("Marca un consultorio como disponible para recibir pacientes. Genera evento ConsultingRoomActivated.")
.Accepts<ActivateConsultingRoomDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/consulting-room/deactivate", async (
    DeactivateConsultingRoomDto dto,
    HttpContext httpContext,
    DeactivateConsultingRoomCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new DeactivateConsultingRoomCommand
    {
        QueueId = dto.QueueId,
        ConsultingRoomId = dto.ConsultingRoomId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Consulting room deactivated",
        CorrelationId = correlationId,
        EventCount = eventCount,
        ConsultingRoomId = dto.ConsultingRoomId
    });
})
.WithName("DeactivateConsultingRoom")
.WithTags("Medical")
.WithSummary("Desactivar consultorio medico")
.WithDescription("Marca un consultorio como no disponible. Los pacientes no seran asignados a este consultorio hasta reactivacion.")
.Accepts<DeactivateConsultingRoomDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/start-consultation", async (
    CallPatientDto dto,
    HttpContext httpContext,
    CallPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CallPatientCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Consultation started successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("StartConsultation")
.WithTags("Medical")
.WithSummary("Iniciar consulta medica")
.WithDescription("Registra que el paciente ha ingresado a consulta con el medico. Genera evento ConsultationStarted.")
.Accepts<CallPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/finish-consultation", async (
    CompleteAttentionDto dto,
    HttpContext httpContext,
    CompleteAttentionCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CompleteAttentionCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Outcome = dto.Outcome,
        Notes = dto.Notes,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Consultation finished successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("FinishConsultation")
.WithTags("Medical")
.WithSummary("Finalizar consulta medica")
.WithDescription("Registra la finalizacion de la consulta con resultado y notas. Genera evento AttentionCompleted.")
.Accepts<CompleteAttentionDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/mark-absent", async (
    MarkAbsentAtConsultationDto dto,
    HttpContext httpContext,
    MarkAbsentAtConsultationCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new MarkAbsentAtConsultationCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient marked absent at consultation",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("MarkAbsentAtConsultation")
.WithTags("Medical")
.WithSummary("Marcar paciente ausente en consulta")
.WithDescription("Registra que el paciente no se presento a la consulta medica programada. Genera evento de ausencia.")
.Accepts<MarkAbsentAtConsultationDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/waiting-room/claim-next", async (
    ClaimNextPatientDto dto,
    HttpContext httpContext,
    ClaimNextPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    logger.LogInformation(
        "ClaimNext request received. CorrelationId: {CorrelationId}, QueueId: {QueueId}",
        correlationId,
        dto.QueueId);

    var command = new ClaimNextPatientCommand
    {
        QueueId = dto.QueueId,
        Actor = dto.Actor,
        CorrelationId = correlationId,
        StationId = dto.StationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient claimed successfully",
        CorrelationId = correlationId,
        EventCount = result.EventCount,
        PatientId = result.PatientId
    });
})
.WithName("ClaimNextPatient")
.WithTags("WaitingRoom")
.WithSummary("Reclamar siguiente paciente")
.WithDescription("Reclama el siguiente paciente disponible en la cola para atencion. Asigna la estacion indicada al paciente.")
.Accepts<ClaimNextPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/waiting-room/call-patient", async (
    CallPatientDto dto,
    HttpContext httpContext,
    CallPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CallPatientCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient called successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("CallPatient")
.WithTags("WaitingRoom")
.WithSummary("Llamar paciente especifico")
.WithDescription("Llama a un paciente especifico de la cola para atencion. Genera evento PatientCalled.")
.Accepts<CallPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/waiting-room/complete-attention", async (
    CompleteAttentionDto dto,
    HttpContext httpContext,
    CompleteAttentionCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CompleteAttentionCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Outcome = dto.Outcome,
        Notes = dto.Notes,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.QueueId, cancellationToken);

    return Results.Ok(new
    {
        Success = true,
        Message = "Attention completed successfully",
        CorrelationId = correlationId,
        EventCount = eventCount,
        PatientId = dto.PatientId
    });
})
.WithName("CompleteAttention")
.WithTags("WaitingRoom")
.WithSummary("Completar atencion del paciente")
.WithDescription("Marca la atencion del paciente como finalizada con resultado y notas opcionales. Genera evento AttentionCompleted.")
.Accepts<CompleteAttentionDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

// ==============================================================================
// STARTUP
// ==============================================================================

// Ensure database schema exists (idempotent, required for all environments)
var eventStore = app.Services.GetRequiredService<IEventStore>();
if (eventStore is PostgresEventStore postgresEventStore)
{
    await postgresEventStore.EnsureSchemaAsync();
    Log.Information("Database schema initialized");
}

Log.Information("Starting WaitingRoom.API...");
Log.Information("Environment: {Environment}", app.Environment.EnvironmentName);

app.Run();

Log.Information("WaitingRoom.API stopped");
Log.CloseAndFlush();
