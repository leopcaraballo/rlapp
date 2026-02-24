# Reglas de Enforcement Arquitectónico

**Versión:** 1.0
**Fecha:** 24 de febrero de 2026
**Scope:** `rlapp-backend/` ÚNICAMENTE
**Binding:** Enterprise-Level (Contractually Enforceable)

---

## 1. Stack Base No Negociable

```
.NET 10 LTS
├── Clean Architecture (4 layers OBLIGATORIO)
├── Domain-Driven Design (strict)
├── Event-Driven Architecture (Event Sourcing + CQRS)
├── Hexagonal Architecture (ports & adapters)
├── Command Query Responsibility Segregation (CQRS)
└── SOLID Principles (100% enforcement)

PostgreSQL
├── Row-Level Security (RLS) HABILITADO
├── Event Store (append-only, immutable)
├── Audit Log (5+ años retention)
└── Column-level encryption (pgcrypto)

RabbitMQ
├── Message durability ENABLED
├── Dead letter queue (DLQ) for retries
├── Topic-based publish/subscribe
└── Confirmation-based delivery

Docker + Kubernetes
├── Multi-container orchestration
├── High availability (≥ 3 replicas)
├── Auto-scaling
└── Network policies (zero-trust)

OpenTelemetry + Prometheus + Grafana
├── Distributed tracing
├── Metrics collection
├── Alerting rules
└── Dashboard aggregation
```

---

## 2. Layers Obligatorios (Clean Architecture)

### 2.1 Estructura de Directorio

```
rlapp-backend/src/
├── BuildingBlocks/
│   ├── Domain/
│   │   ├── Entities.cs                    # Core domain objects (stable)
│   │   ├── ValueObjects.cs                # Immutable value types
│   │   ├── DomainEvents.cs                # Event types (immutable)
│   │   ├── DomainExceptions.cs            # Domain-specific exceptions
│   │   └── Interfaces/                    # Domain contracts
│   │
│   ├── Application/
│   │   ├── Commands/
│   │   │   ├── CreateAppointmentCommand.cs
│   │   │   └── ApproveFinancialValidationCommand.cs
│   │   ├── Queries/
│   │   │   ├── GetAppointmentQuery.cs
│   │   │   └── ListAppointmentsByStatusQuery.cs
│   │   ├── DTOs/
│   │   ├── Handlers/                      # Command/Query handlers
│   │   ├── Interfaces/
│   │   └── Validators/                    # FluentValidation rules
│   │
│   ├── Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── AppointmentRepository.cs
│   │   │   ├── EventStore.cs
│   │   │   └── AuditLogRepository.cs
│   │   ├── Messaging/
│   │   │   ├── RabbitMqPublisher.cs
│   │   │   └── MessageConsumer.cs
│   │   ├── Security/
│   │   │   ├── JwtTokenProvider.cs
│   │   │   ├── RoleBasedAccessControl.cs
│   │   │   └── EncryptionService.cs
│   │   ├── Observability/
│   │   │   ├── OpenTelemetrySetup.cs
│   │   │   ├── PrometheusMetrics.cs
│   │   │   └── LoggingConfiguration.cs
│   │   └── ExternalIntegrations/
│   │
│   └── API/
│       ├── Controllers/
│       │   ├── AppointmentController.cs
│       │   ├── FinancialValidationController.cs
│       │   └── PatientDataController.cs
│       ├── Middlewares/
│       │   ├── ExceptionHandlingMiddleware.cs
│       │   ├── AuthenticationMiddleware.cs
│       │   └── TenantIsolationMiddleware.cs
│       ├── Filters/
│       │   └── ValidateModelFilter.cs
│       └── Program.cs
│
├── Services/
│   ├── AppointmentService/
│   │   ├── Domain/                        # Entidades, eventos
│   │   ├── Application/                   # Casos de uso
│   │   ├── Infrastructure/                # Repositorio, messaging
│   │   └── API/                           # Controllers
│   │
│   └── FinancialService/
│       ├── Domain/
│       │   ├── FinancialValidation.cs     # CORE AGGREGATE
│       │   ├── FinancialValidationStatus.cs
│       │   └── FinancialValidationCompleted.cs (Domain Event)
│       ├── Application/
│       │   ├── ApproveFinancialValidationCommand.cs
│       │   └── IFinancialValidationService.cs
│       ├── Infrastructure/
│       │   ├── SqlFinancialRepository.cs
│       │   └── RabbitMqFinancialPublisher.cs
│       └── API/
│           └── FinancialValidationController.cs
│
└── Tests/
    ├── Domain/
    │   ├── AppointmentAggregateTests.cs   # Domain logic tests
    │   └── FinancialInvariantTests.cs     # Critical!! ≥95% coverage
    ├── Application/
    │   ├── CreateAppointmentCommandTests.cs
    │   └── ApproveFinancialValidationCommandTests.cs
    ├── Infrastructure/
    │   ├── RepositoryTests.cs
    │   ├── RabbitMqPublisherTests.cs
    │   └── EncryptionServiceTests.cs
    └── Integration/
        ├── AppointmentWorkflowTests.cs
        ├── FinancialValidationEndToEndTests.cs
        └── TenantIsolationTests.cs
```

### 2.2 Layer Contracts

#### Layer 1: Domain

**Responsabilidad:** Lógica de negocio pura, independent de frameworks

```csharp
// ✓ PERMITTED
namespace LCWPS.Services.AppointmentService.Domain
{
    public class Appointment : AggregateRoot
    {
        public Guid Id { get; private set; }
        public Guid TenantId { get; private set; }  // CRITICAL: Tenant isolation
        public DateTime ScheduledAt { get; private set; }
        public FinancialValidationStatus FinancialStatus { get; private set; }

        // INVARIANT: Cannot transition to Waiting without financial approval
        public void TransitionToWaiting()
        {
            if (FinancialStatus != FinancialValidationStatus.Approved)
                throw new InvalidOperationException(
                    "Appointment cannot move to Waiting without financial approval");

            Status = AppointmentStatus.Waiting;
            AddDomainEvent(new AppointmentTransitionedToWaiting(Id, TenantId, DateTime.UtcNow));
        }

        // INVARIANT: Prevent double approval
        public void ApproveFinancially(UserId approvedBy)
        {
            if (FinancialStatus == FinancialValidationStatus.Approved)
                throw new InvalidOperationException("Already approved");

            FinancialStatus = FinancialValidationStatus.Approved;
            ApprovedBy = approvedBy;
            ApprovedAt = DateTime.UtcNow;
            AddDomainEvent(new FinancialValidationCompleted(
                Id, TenantId, approvedBy, DateTime.UtcNow));
        }
    }

    // ✗ FORBIDDEN
    // public void AutoApproveIfEligible() ↔ NO automatic approval
    // public class Appointment { public FinancialStatus { get; set; } } ↔ No public setter
}
```

**Rules:**

- NO dependencies en Infrastructure, Application, o API layers
- NO Entity Framework, NO RabbitMQ client, NO HTTP
- Pure domain logic, testable sin mocking
- Immutable value objects, aggregate roots with invariant enforcement
- Domain events ALWAYS raised para cambios significativos

#### Layer 2: Application

**Responsabilidad:** Orquestar casos de uso, puertos (interfaces)

```csharp
namespace LCWPS.Services.AppointmentService.Application.Commands
{
    // Command (CQRS write side)
    public class ApproveFinancialValidationCommand : IRequest<Result>
    {
        public Guid AppointmentId { get; init; }
        public Guid ApprovedBy { get; init; }  // Admin/Finance Officer
        public string Justification { get; init; }
        public bool RequiresOverride { get; init; }
    }

    // Handler (MediatR pattern)
    public class ApproveFinancialValidationHandler : IRequestHandler<ApproveFinancialValidationCommand, Result>
    {
        private readonly IAppointmentRepository _appointmentRepo;
        private readonly IAuditLogService _auditLog;
        private readonly IFinancialEventPublisher _publisher;

        public async Task<Result> Handle(ApproveFinancialValidationCommand request, CancellationToken ct)
        {
            var appointment = await _appointmentRepo.GetById(request.AppointmentId, ct);

            if (appointment == null)
                return Result.Failure("Appointment not found");

            // Domain logic (aggregate method)
            appointment.ApproveFinancially(new UserId(request.ApprovedBy));

            // Persist
            await _appointmentRepo.Save(appointment, ct);

            // Publish events to RabbitMQ
            foreach (var domainEvent in appointment.GetUncommittedEvents())
            {
                await _publisher.PublishAsync(domainEvent, ct);
            }

            // Audit trail
            await _auditLog.Log(new AuditEntry
            {
                Action = "FINANCIAL_APPROVAL",
                AppointmentId = request.AppointmentId,
                PerformedBy = request.ApprovedBy,
                Justification = request.Justification,
                Timestamp = DateTime.UtcNow
            }, ct);

            return Result.Success();
        }
    }
}

// Query (CQRS read side)
namespace LCWPS.Services.AppointmentService.Application.Queries
{
    public class GetAppointmentStatusQuery : IRequest<AppointmentStatusDto>
    {
        public Guid AppointmentId { get; init; }
    }

    public class GetAppointmentStatusHandler : IRequestHandler<GetAppointmentStatusQuery, AppointmentStatusDto>
    {
        private readonly IAppointmentReadRepository _readRepo;

        public async Task<AppointmentStatusDto> Handle(GetAppointmentStatusQuery request, CancellationToken ct)
        {
            // Read from denormalized view (not event store directly)
            var appointment = await _readRepo.GetStatusById(request.AppointmentId, ct);

            return new AppointmentStatusDto
            {
                Id = appointment.Id,
                Status = appointment.Status.ToString(),
                FinancialApprovalStatus = appointment.FinancialStatus.ToString()
            };
        }
    }
}
```

**Rules:**

- NO direct database access (use repository pattern)
- Validators MUST validate all inputs (FluentValidation)
- Commands = state change, Queries = read-only
- Orchestrate domain logic, don't embed it
- Publish domain events via IEventPublisher interface

#### Layer 3: Infrastructure

**Responsabilidad:** Technical details (persistence, messaging, external calls)

```csharp
namespace LCWPS.Services.AppointmentService.Infrastructure.Persistence
{
    public class SqlAppointmentRepository : IAppointmentRepository
    {
        private readonly AppDbContext _dbContext;

        public async Task<Appointment> GetById(Guid id, CancellationToken ct)
        {
            // RLS enforcement: Row-Level Security via tenant context
            var appointmentDto = await _dbContext.Appointments
                .Where(a => a.Id == id && a.TenantId == _dbContext.CurrentTenantId)
                .FirstOrDefaultAsync(ct);

            return appointmentDto?.ToDomain();
        }

        public async Task Save(Appointment aggregate, CancellationToken ct)
        {
            var dto = AppointmentDto.FromDomain(aggregate);
            _dbContext.Appointments.Update(dto);

            // Persist domain events to event store (append-only)
            foreach (var domainEvent in aggregate.GetUncommittedEvents())
            {
                var eventRecord = new EventRecord
                {
                    AggregateId = aggregate.Id,
                    EventType = domainEvent.GetType().Name,
                    EventPayload = JsonSerializer.Serialize(domainEvent),
                    CreatedAt = DateTime.UtcNow,
                    Version = aggregate.Version
                };
                _dbContext.EventStore.Add(eventRecord);
            }

            await _dbContext.SaveChangesAsync(ct);
        }
    }
}

namespace LCWPS.Services.AppointmentService.Infrastructure.Messaging
{
    public class RabbitMqFinancialEventPublisher : IFinancialEventPublisher
    {
        private readonly IConnection _connection;

        public async Task PublishAsync(DomainEvent domainEvent, CancellationToken ct)
        {
            using var channel = _connection.CreateModel();

            // Ensure queue is durable
            channel.ExchangeDeclare(
                exchange: "appointments.events",
                type: ExchangeType.Topic,
                durable: true);

            channel.QueueDeclare(
                queue: "financial-validations",
                durable: true,
                exclusive: false,
                autoDelete: false);

            var messageBody = Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(domainEvent));

            var properties = channel.CreateBasicProperties();
            properties.Persistent = true;  // Durability
            properties.CorrelationId = domainEvent.CorrelationId.ToString();
            properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

            channel.BasicPublish(
                exchange: "appointments.events",
                routingKey: "financial.validation.completed",
                basicProperties: properties,
                body: messageBody);

            await Task.CompletedTask;
        }
    }
}
```

**Rules:**

- ONLY layer that knows about EF Core, RabbitMQ, PostgreSQL
- Repositories implement domain interfaces (dependency inversion)
- External APIs behind service interfaces
- Configuration via dependency injection

#### Layer 4: API (Presentation)

**Responsabilidad:** HTTP endpoints, request/response translation

```csharp
namespace LCWPS.Services.FinancialService.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]  // JWT authentication
    public class FinancialValidationController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<FinancialValidationController> _logger;

        // POST: /api/financial-validation/approve
        [HttpPost("approve")]
        [Authorize(Roles = "FINANCE_DIRECTOR,CCO")]  // RBAC
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> ApproveFinancialValidation(
            [FromBody] ApproveFinancialValidationRequest request,
            CancellationToken cancellationToken)
        {
            // Request validation
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Map to command
            var command = new ApproveFinancialValidationCommand
            {
                AppointmentId = request.AppointmentId,
                ApprovedBy = User.GetUserId(),  // From JWT claims
                Justification = request.Justification,
                RequiresOverride = request.RequiresOverride
            };

            // Execute through MediatR (CQRS)
            var result = await _mediator.Send(command, cancellationToken);

            if (result.IsFailure)
                return BadRequest(new { error = result.Error });

            _logger.LogInformation(
                "Financial validation approved for appointment {appointmentId} by {userId}",
                request.AppointmentId, User.GetUserId());

            return Ok(new { message = "Financial validation approved" });
        }

        // GET: /api/financial-validation/{appointmentId}/status
        [HttpGet("{appointmentId}/status")]
        [Authorize(Roles = "PHYSICIAN,FINANCE_DIRECTOR,ADMIN")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetFinancialValidationStatus(
            [FromRoute] Guid appointmentId,
            CancellationToken cancellationToken)
        {
            var query = new GetFinancialValidationStatusQuery { AppointmentId = appointmentId };
            var result = await _mediator.Send(query, cancellationToken);

            if (result == null)
                return NotFound();

            return Ok(result);
        }
    }
}
```

**Rules:**

- Controllers THIN (delegate to application layer)
- Input validation via data annotations + FluentValidation
- Output DTOs (never return domain objects)
- RBAC via [Authorize(Roles = "...")]
- Logging security events

---

## 3. Domain-Driven Design (DDD) Enforcement

### 3.1 Boundries de Dominio (Agregados)

```
Appointment Aggregate
├── Root: Appointment (entity)
├── Children:
│   ├── Appointment Slot (value object)
│   ├── Patient Reference (value object)
│   └── Financial Status (value object)
├── Events: AppointmentCreated, AppointmentTransitioned, FinancialValidationCompleted
└── Repository: IAppointmentRepository

FinancialValidation Aggregate (CRITICAL)
├── Root: FinancialValidation (entity)
├── Children:
│   ├── ApprovedBy (value object)
│   └── Justification (value object)
├── Invariants:
│   - Cannot approve own appointment
│   - Cannot double-approve
│   - Amounts > UVR 600 require dual approval
├── Events: FinancialValidationCompleted, FinancialValidationRejected
└── Repository: IFinancialValidationRepository

Tenant Aggregate
├── Root: Tenant (entity)
├── Children: Tenant metadata
├── Invariants: Tenant isolation enforced via RLS
└── Repository: ITenantRepository
```

### 3.2 Value Objects

Immutable, comparable by value:

```csharp
public class Money : ValueObject
{
    public decimal Amount { get; }
    public string Currency { get; }  // COP

    public Money(decimal amount, string currency = "COP")
    {
        if (amount < 0) throw new InvalidOperationException("Amount must be positive");
        if (string.IsNullOrEmpty(currency)) throw new InvalidOperationException("Currency required");

        Amount = amount;
        Currency = currency;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }
}

public class Justification : ValueObject
{
    public string Text { get; }

    public Justification(string text)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Length < 10)
            throw new InvalidOperationException("Justification must be >= 10 chars");

        Text = text;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Text;
    }
}
```

---

## 4. Event Sourcing (MANDATORY para Financial)

### 4.1 Event Store

```sql
-- PostgreSQL Event Store (Append-Only, Immutable)
CREATE TABLE event_store (
    event_id BIGSERIAL PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_payload JSONB NOT NULL,
    event_version INT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    correlation_id UUID NOT NULL,
    causation_id UUID,
    metadata JSONB,
    INDEX idx_aggregate_version (aggregate_id, event_version),
    INDEX idx_event_type (event_type),
    UNIQUE (aggregate_id, event_version)
);

-- Audit entry (Financial Validation)
CREATE TABLE financial_audit_log (
    id BIGSERIAL PRIMARY KEY,
    appointment_id UUID NOT NULL,
    event_id BIGSERIAL REFERENCES event_store(event_id),
    action VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(15,2),
    justification TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cannot_update_audit_log CHECK (created_at = created_at)  -- Anti-tampering
);

-- RLS for tenant isolation
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_events ON event_store
    USING (aggregate_id IN (
        SELECT id FROM appointments WHERE tenant_id = current_user_tenant_id()
    ));
```

### 4.2 Event Publishing

```csharp
public abstract class DomainEvent
{
    public Guid CorrelationId { get; set; }
    public Guid CausationId { get; set; }
    public DateTime OccurredAt { get; set; }

    protected DomainEvent()
    {
        CorrelationId = Guid.NewGuid();
        OccurredAt = DateTime.UtcNow;
    }
}

public class FinancialValidationCompleted : DomainEvent
{
    public Guid AppointmentId { get; set; }
    public Guid TenantId { get; set; }
    public Guid ApprovedBy { get; set; }
    public DateTime ApprovedAt { get; set; }
    public decimal Amount { get; set; }
    public string Justification { get; set; }
}

// Publisher
public interface IEventPublisher
{
    Task PublishAsync<T>(T @event, CancellationToken cancellationToken) where T : DomainEvent;
}

public class RabbitMqEventPublisher : IEventPublisher
{
    public async Task PublishAsync<T>(T @event, CancellationToken cancellationToken) where T : DomainEvent
    {
        var message = JsonSerializer.Serialize(@event);
        var routingKey = typeof(T).Name.ToLower();

        await _channel.BasicPublishAsync(
            exchange: "domain.events",
            routingKey: routingKey,
            mandatory: true,
            body: Encoding.UTF8.GetBytes(message),
            basicProperties: CreateProperties(@event));
    }

    private IBasicProperties CreateProperties(DomainEvent @event)
    {
        var props = _channel.CreateBasicProperties();
        props.Persistent = true;
        props.CorrelationId = @event.CorrelationId.ToString();
        props.Type = @event.GetType().Name;
        props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        return props;
    }
}
```

---

## 5. CQRS (Command Query Responsibility Segregation)

### 5.1 Separación de lectura/escritura

```
Write Side (Commands)
├── FinancialValidationService writes to Event Store
├── Publishes FinancialValidationCompleted event
└── Updates materialized views asynchronously

Read Side (Queries)
├── AppointmentReadRepository queries denormalized view
├── No access to Event Store for reads
└── Always up-to-date via event handlers
```

### 5.2 Implementation

```csharp
// Write side
public class FinancialValidationCommandService
{
    private readonly IAppointmentRepository _accountRepo;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _publisher;

    public async Task ApproveAsync(ApproveFinancialValidationCommand cmd, CancellationToken ct)
    {
        var aggregate = await _accountRepo.GetById(cmd.AppointmentId, ct);
        aggregate.ApproveFinancially(cmd.ApprovedBy);

        // Store events
        var events = aggregate.GetUncommittedEvents();
        await _eventStore.AppendAsync(aggregate.Id, events, ct);

        // Publish to RabbitMQ
        foreach (var @event in events)
            await _publisher.PublishAsync(@event, ct);
    }
}

// Read side: Materialized View Updated by Event Handlers
public class AppointmentReadModelBuilder
{
    private readonly IAppointmentReadRepository _readRepo;

    public async Task Handle(FinancialValidationCompleted @event, CancellationToken ct)
    {
        var appointments = await _readRepo.GetById(@event.AppointmentId, ct);
        appointments.FinancialApprovalStatus = "Approved";
        appointments.ApprovedBy = @event.ApprovedBy;
        appointments.ApprovedAt = @event.ApprovedAt;

        await _readRepo.UpdateAsync(appointments, ct);
    }
}
```

---

## 6. Test Pyramid (Domain-First)

```
        /\
       /  \    E2E Integration Tests
      /    \   (AppointmentWorkflowTests)
     /      \  Coverage: ≥ 90%
    /________\

    /\
   /  \      Contract Tests
  /    \     (RabbitMQ publisher)
 /      \    Coverage: ≥ 85%
/________\

 /\
/  \       Application Layer Tests
    \      (CommandHandlerTests, QueryTests)
    /      Coverage: ≥ 90%
  /\

 /\
/  \       Domain Tests (CORE)
    \      (AppointmentAggregateTests)
    /      (FinancialValidationTests)
  /\       Coverage: ≥ 95% (MANDATORY)
 /\
    \      Anti-pattern: Coverage < 95% in domain = FAIL
```

### 6.1 Domain Test Example (Financial Invariants)

```csharp
[TestFixture]
public class FinancialValidationInvariantTests
{
    private Appointment _appointment;

    [SetUp]
    public void Setup()
    {
        _appointment = Appointment.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),  // tenantId
            DateTime.UtcNow.AddHours(1));
    }

    [Test]
    public void TransitionToWaiting_WhenNotApproved_ThrowsException()
    {
        // Arrange
        _appointment.FinancialStatus = FinancialValidationStatus.Pending;

        // Act & Assert
        Assert.Throws<InvalidOperationException>(
            () => _appointment.TransitionToWaiting(),
            "Cita debe estar aprobada financieramente");
    }

    [Test]
    public void ApproveFinancially_WhenAlreadyApproved_ThrowsException()
    {
        // Arrange
        _appointment.ApproveFinancially(Guid.NewGuid());

        // Act & Assert
        Assert.Throws<InvalidOperationException>(
            () => _appointment.ApproveFinancially(Guid.NewGuid()),
            "Cannot double-approve");
    }

    [Test]
    public void ApproveFinancially_RaisesFinancialValidationCompletedEvent()
    {
        // Arrange
        var approver = Guid.NewGuid();

        // Act
        _appointment.ApproveFinancially(approver);

        // Assert
        var events = _appointment.GetUncommittedEvents();
        Assert.AreEqual(1, events.Count());
        Assert.IsInstanceOf<FinancialValidationCompleted>(events.First());
        Assert.AreEqual(approver, ((FinancialValidationCompleted)events.First()).ApprovedBy);
    }
}
```

---

## 7. Forbidden Anti-Patterns

| Anti-Patrón | Razón | Penalidad |
|-------------|-------|----------|
| Aggregate mutation without domain method | Violates invariants | FAIL code review |
| Direct database access (bypass repository) | Breaks DDD, injects infrastructure | FAIL SAST |
| Hardcoded SQL queries | Injection vulnerability, no domain logic | FAIL security scan |
| Public setters on entities | Uncontrolled state mutation | FAIL architectural gate |
| Automatic financial approval | Regulatory violation (Circular SFC) | ESCALATE + ROLLBACK |
| Skipping domain events | Loss of audit trail, breaks recovery | FAIL domain coverage |
| Helper.ValidateFinancial() static method | Not testable, violates SOLID | FAIL peer review |
| Synchronous financial validation | Blocks appointment flow | Code review rejection |
| No pagination on repository.GetAll() | Performance risk, potential DoS | FAIL load testing |
| Self-approval workflows | Regulatory violation, fraud risk | ESCALATE to security |

---

## 8. Code Review Checklist (Architectural)

```
□ Layer boundaries respected (no layer skip)
□ Domain logic isolated, testable
□ Aggregates with invariants enforced
□ Value objects immutable
□ Domain events published for state changes
□ Event Store entries immutable
□ CQRS commands/queries separated
□ Repositories implement domain interfaces
□ RLS verified on sensitive tables
□ Tenant isolation enforced
□ Financial flows >= 95% domain coverage
□ No direct EF Core in domain/application
□ No HTTP calls outside infrastructure layer
□ External dependencies injected
□ Logging security/financial events
□ Exception handling (domain exceptions explicit)
□ Async/await pattern consistent
□ No fire-and-forget tasks (await or RunAsyncTask with tracking)
□ Comment // HUMAN CHECK for trade-offs
```

---

**Architecture Enforcement:** BINDING
**Verification:** Automated + peer review
**Escalation:** Tech Lead → Chief Architect
