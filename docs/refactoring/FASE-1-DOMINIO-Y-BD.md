# RLAPP - Plan de Refactorización: Eliminar Queues + Rediseño del Flujo
## Fase 1: Base de Datos, Modelo de Dominio y Event Store

**Versión:** 1.0  
**Fecha:** 2026-03-19  
**Estado:** DRAFT  
**Arquitecto:** Senior Software Architect  

---

## 📋 Tabla de Contenidos

1. [Visión General del Refactoring](#visión-general)
2. [Cambios Struct del Dominio](#cambios-struct)
3. [Fase 1: DB + Modelo de Dominio](#fase-1-detalle)
4. [Esquema SQL Nueva](#schema-sql)
5. [Nuevos Eventos de Dominio](#eventos-nuevos)
6. [Agregado Rediseñado](#agregado-nuevo)
7. [Proyecciones Rediseñadas](#proyecciones)
8. [Checklist Fase 1](#checklist-fase-1)

---

## Visión General {#visión-general}

### Problema Actual
- El sistema está **fuertemente acoplado** a un concepto de `queueId` (agregado raíz `WaitingQueue`)
- **Flujo lineal**: Recepción → Caja → Consultorio (gestión secuencial)
- **Trazabilidad**: Basada en colas, no en pacientes
- **Limitaciones**: Difícil escalar a múltiples consultorios paralelos, flujo no intuitivo

### Nueva Visión 🎯
- **Paciente como epicentro**: El `patientId` es la única identidad única e inmutable
- **Flujo descentralizado**: Recepción asigna consultorio → Médico atiende en paralelo → Caja cobra
- **Trazabilidad por paciente**: El estado de cada paciente es independiente, rastreable por su cédula/ID
- **Escalabilidad**: N consultorios activos simultáneamente, N cajeros, N recepcionistas

### Principios de Diseño

| Principio | Aplicación |
|-----------|-----------|
| **Domain-Driven Design** | El paciente es la raíz agregada principal; consultorios son agregados secundarios |
| **Event Sourcing** | TODO cambio de estado emite un evento; el event store es la fuente de verdad |
| **CQRS** | Comandos separados de queries; proyecciones especializadas por rol |
| **Outbox Pattern** | Garantía de entrega end-to-end (evento → outbox → RabbitMQ → proyecciones) |
| **Value Objects** | `PatientId`, `ConsultingRoomId`, `PaymentAmount` encapsulan lógica de validación |

---

## Cambios Struct del Dominio {#cambios-struct}

### Antes (Actual)

```
┌─────────────────────────────────────────┐
│         WaitingQueue (Agregado)          │
│         (queueId como identidad)         │
├─────────────────────────────────────────┤
│ • QueueName, MaxCapacity                │
│ • Patients: List<WaitingPatient>        │
│ • CurrentCashierPatientId               │
│ • CurrentAttentionPatientId             │
│ • _activeConsultingRooms: HashSet       │
│ • _patientStates: Dict<pid, state>      │
└─────────────────────────────────────────┘

Flow: Check-in → (queueId) → state en memoria
                        ↓
                   Event Store (con queueId)
```

### Después (Nuevo)

```
┌──────────────────────────────┐         ┌────────────────────────────┐
│  Patient Aggregate           │         │  ConsultingRoom Aggregate  │
│  (patientId como identidad)  │         │  (roomId como identidad)   │
├──────────────────────────────┤         ├────────────────────────────┤
│ • PatientIdentity (cédula)   │         │ • RoomId, RoomName        │
│ • PatientName, Contacts      │         │ • IsActive: bool          │
│ • CurrentState               │         │ • CurrentPatientId        │
│ • WaitingStartedAt           │         │ • AttentionStartedAt      │
│ • AssignedRoomId (nullable)  │         │ • LastModifiedAt          │
│ • LastModifiedAt             │         └────────────────────────────┘
└──────────────────────────────┘

Flow: Check-in → PatientId → Event Store (con patientId como aggregateId)
        ↓                           ↓
    Registro público       PatientRegistered event
        ↓                           ↓
    Recepción → asigna escuadra → PatientConsultingRoomAssigned
        ↓                           ↓
    Médico inicia   + ConsultingRoom ocupada → PatientConsultationStarted
        ↓                           ↓
    Médico finaliza              PatientConsultationFinished
        ↓                           ↓
    Caja valida pago             PatientPaymentValidated
        ↓                           ↓
    Paciente DONE               PatientCompleted
```

---

## Fase 1 — Detalle {#fase-1-detalle}

### 1.1 Rediseño del Agregado Patient

#### Responsabilidades
- **Gestionador del ciclo de vida del paciente**: debe conocer en qué estado se encuentra
- **Invariantes de negocio**: un paciente no puede estar en dos consultorios a la vez
- **Historial de transiciones**: cada cambio de estado emite un evento en el event store
- **Independencia**: su estado es **completamente independiente** de cualquier cola

#### Código del Agregado (C# / .NET)

```csharp
namespace WaitingRoom.Domain.Aggregates;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.Events;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Domain.Entities;
using WaitingRoom.Domain.Invariants;
using WaitingRoom.Domain.Exceptions;

/// <summary>
/// Aggregate Root: Patient
/// 
/// Represents the complete lifecycle of a patient in the waiting room system.
/// This is now the PRIMARY aggregate root, replacing the queue-centric approach.
/// 
/// Lifecycle states:
/// 1. REGISTERED: Patient registered via public form
/// 2. WAITING: Patient registered; waiting for reception assignment
/// 3. ASSIGNED: Reception has assigned a consulting room
/// 4. IN_CONSULTATION: Patient in Doctor's consultation
/// 5. FINISHED_CONSULTATION: Doctor finished the consultation
/// 6. AT_CASHIER: Patient at cashier counter
/// 7. PAYMENT_VALIDATED: Cashier validated payment
/// 8. COMPLETED: Patient process finished, left system
/// 9. ABSENT_AT_CONSULTATION: Patient didn't show up for consultation
/// 10. ABSENT_AT_CASHIER: Patient didn't show up for cashier
/// 11. CANCELLED_BY_PAYMENT: Patient cancelled due to payment issues
/// 
/// Invariants:
/// - Patient can only have one assigned consulting room at a time
/// - State transitions must follow the defined state machine
/// - Payment amount is > 0 when entering AT_CASHIER state
/// - Once COMPLETED or ABSENT_*, no further state changes allowed
/// </summary>
public sealed class Patient : AggregateRoot
{
    // ===== IMMUTABLE PATIENT IDENTITY =====
    public PatientIdentity Identity { get; private set; } = null!;
    public string PatientName { get; private set; } = string.Empty;
    public string? PhoneNumber { get; private set; }
    
    // ===== STATE MANAGEMENT =====
    public PatientState CurrentState { get; private set; } = PatientState.Unknown;
    public DateTime CreatedAt { get; private set; }
    public DateTime LastModifiedAt { get; private set; }
    
    // ===== FLOW-SPECIFIC STATE =====
    public DateTime? WaitingStartedAt { get; private set; }
    public string? AssignedConsultingRoomId { get; private set; }
    public DateTime? ConsultationStartedAt { get; private set; }
    public DateTime? ConsultationFinishedAt { get; private set; }
    public decimal? PaymentAmount { get; private set; }
    public int PaymentAttempts { get; private set; }
    public DateTime? PaymentValidatedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? LeaveReason { get; private set; } // ABSENT_AT_CONSULTATION, ABSENT_AT_CASHIER, etc.

    // Constructor privado (event sourcing pattern)
    private Patient() { }

    /// <summary>
    /// Factory method: Creates a new Patient aggregate (REGISTERED state).
    /// 
    /// This is called when a patient registers via the public form.
    /// </summary>
    public static Patient Create(
        string patientId,
        PatientIdentity identity,
        string patientName,
        string? phoneNumber,
        EventMetadata metadata)
    {
        PatientInvariants.ValidatePatientIdentity(identity);
        PatientInvariants.ValidatePatientName(patientName);

        var patient = new Patient();

        var @event = new PatientRegistered
        {
            Metadata = metadata.WithVersion(patient.Version + 1),
            PatientId = patientId,
            PatientIdentity = identity.Value, // cedula/ID
            PatientName = patientName.Trim(),
            PhoneNumber = phoneNumber,
            RegisteredAt = metadata.OccurredAt
        };

        patient.RaiseEvent(@event);
        return patient;
    }

    /// <summary>
    /// Command: Receptionist marks patient as "En Espera" (WAITING state).
    /// This typically happens after check-in verification in reception.
    /// </summary>
    public void MarkAsWaiting(MarkPatientAsWaitingRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.Waiting);

        var @event = new PatientMarkedAsWaiting
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            WaitingStartedAt = request.OccurredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Receptionist assigns a consulting room to the patient.
    /// Moves patient from WAITING → ASSIGNED state.
    /// 
    /// Invariant: Patient cannot be assigned to a room if already in consultation elsewhere.
    /// </summary>
    public void AssignConsultingRoom(AssignConsultingRoomRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.Assigned);
        PatientInvariants.ValidateConsultingRoomId(request.ConsultingRoomId);
        
        if (!request.IsRoomActive)
            throw new DomainException($"Consulting room {request.ConsultingRoomId} is not active");

        var @event = new PatientConsultingRoomAssigned
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = request.ConsultingRoomId,
            AssignedAt = request.OccurredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Doctor initiates the consultation.
    /// Moves patient from ASSIGNED → IN_CONSULTATION state.
    /// </summary>
    public void StartConsultation(StartConsultationRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.InConsultation);

        var @event = new PatientConsultationStarted
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = AssignedConsultingRoomId 
                ?? throw new DomainException("Patient has no assigned consulting room"),
            StartedAt = request.OccurredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Doctor finishes the consultation.
    /// Moves patient from IN_CONSULTATION → FINISHED_CONSULTATION state.
    /// </summary>
    public void FinishConsultation(FinishConsultationRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.FinishedConsultation);

        var @event = new PatientConsultationFinished
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = AssignedConsultingRoomId 
                ?? throw new DomainException("Patient has no assigned consulting room"),
            FinishedAt = request.OccurredAt,
            Notes = request.Notes
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Patient arrives at cashier.
    /// Moves patient from FINISHED_CONSULTATION → AT_CASHIER state.
    /// 
    /// At this point, the system generates a random payment amount for simulation.
    /// </summary>
    public void ArriveCashier(ArriveCashierRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.AtCashier);

        // Generate random payment amount for simulation
        var paymentAmount = request.GeneratedPaymentAmount;
        PatientInvariants.ValidatePaymentAmount(paymentAmount);

        var @event = new PatientArrivedAtCashier
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            PaymentAmount = paymentAmount,
            ArrivedAt = request.OccurredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Cashier validates payment.
    /// Moves patient from AT_CASHIER → PAYMENT_VALIDATED state.
    /// </summary>
    public void ValidatePayment(ValidatePaymentRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.PaymentValidated);
        PatientInvariants.ValidatePaymentAmount(PaymentAmount ?? 0);

        var @event = new PatientPaymentValidated
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            ValidatedAt = request.OccurredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Process completed.
    /// Moves patient from PAYMENT_VALIDATED → COMPLETED state.
    /// </summary>
    public void Complete(CompletePatientRequest request)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.Completed);

        var @event = new PatientCompleted
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            CompletedAt = request.OccurredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Mark patient as absent during consultation.
    /// Moves patient to ABSENT_AT_CONSULTATION state.
    /// </summary>
    public void MarkAbsentAtConsultation(MarkAbsentAtConsultationRequest request)
    {
        PatientInvariants.ValidateStateTransitionToTerminal(CurrentState, PatientState.AbsentAtConsultation);

        var @event = new PatientMarkedAbsentAtConsultation
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = AssignedConsultingRoomId,
            MarkedAbsentAt = request.OccurredAt,
            Reason = request.Reason
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Mark patient as absent at cashier.
    /// Moves patient to ABSENT_AT_CASHIER state.
    /// </summary>
    public void MarkAbsentAtCashier(MarkAbsentAtCashierRequest request)
    {
        PatientInvariants.ValidateStateTransitionToTerminal(CurrentState, PatientState.AbsentAtCashier);

        var @event = new PatientMarkedAbsentAtCashier
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            PatientId = Id,
            MarkedAbsentAt = request.OccurredAt,
            Reason = request.Reason
        };

        RaiseEvent(@event);
    }

    // ===== EVENT HANDLERS (APPLIED TO EVENT) =====

    public void Apply(PatientRegistered @event)
    {
        Id = @event.PatientId;
        Identity = new PatientIdentity(@event.PatientIdentity);
        PatientName = @event.PatientName;
        PhoneNumber = @event.PhoneNumber;
        CurrentState = PatientState.Registered;
        CreatedAt = @event.RegisteredAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientMarkedAsWaiting @event)
    {
        CurrentState = PatientState.Waiting;
        WaitingStartedAt = @event.WaitingStartedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientConsultingRoomAssigned @event)
    {
        CurrentState = PatientState.Assigned;
        AssignedConsultingRoomId = @event.ConsultingRoomId;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientConsultationStarted @event)
    {
        CurrentState = PatientState.InConsultation;
        ConsultationStartedAt = @event.StartedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientConsultationFinished @event)
    {
        CurrentState = PatientState.FinishedConsultation;
        ConsultationFinishedAt = @event.FinishedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
        // Clear room assignment once consultation done
        AssignedConsultingRoomId = null;
    }

    public void Apply(PatientArrivedAtCashier @event)
    {
        CurrentState = PatientState.AtCashier;
        PaymentAmount = @event.PaymentAmount;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientPaymentValidated @event)
    {
        CurrentState = PatientState.PaymentValidated;
        PaymentValidatedAt = @event.ValidatedAt;
        PaymentAttempts++;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientCompleted @event)
    {
        CurrentState = PatientState.Completed;
        CompletedAt = @event.CompletedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientMarkedAbsentAtConsultation @event)
    {
        CurrentState = PatientState.AbsentAtConsultation;
        LeaveReason = @event.Reason;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(PatientMarkedAbsentAtCashier @event)
    {
        CurrentState = PatientState.AbsentAtCashier;
        LeaveReason = @event.Reason;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }
}

/// <summary>
/// Enum representing all valid patient states in the system.
/// </summary>
public enum PatientState
{
    Unknown = 0,
    Registered = 1,        // Just registered, not yet acknowledged by reception
    Waiting = 2,           // Waiting for reception to assign a consulting room
    Assigned = 3,          // Reception assigned a consulting room
    InConsultation = 4,    // Patient in doctor's consultation
    FinishedConsultation = 5, // Doctor finished consultation
    AtCashier = 6,         // Patient moved to cashier
    PaymentValidated = 7,  // Cashier validated payment
    Completed = 8,         // Patient process completed, left system
    AbsentAtConsultation = 9,  // Patient didn't show for consultation
    AbsentAtCashier = 10,  // Patient didn't show for cashier
    CancelledByPayment = 11 // Patient cancelled due to payment issues
}
```

### 1.2 Agregado ConsultingRoom (Rediseño)

```csharp
namespace WaitingRoom.Domain.Aggregates;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.Events;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Domain.Invariants;
using WaitingRoom.Domain.Exceptions;

/// <summary>
/// Aggregate Root: ConsultingRoom
/// 
/// Represents a single consulting room in the medical facility.
/// Each room can manage its own state independent of other rooms.
/// 
/// Properties:
/// - roomId: Unique identifier (e.g., "ROOM-001", "ROOM-002", etc.)
/// - Name: Display name (e.g., "Consultorio Dr. Garcia")
/// - IsActive: Whether the room is available for consultations
/// - CurrentPatientId: Patient currently being attended (if any)
/// - AttentionStartedAt: When the current consultation started
/// 
/// Invariants:
/// - A room can only attend one patient at a time
/// - Only administrators can activate/deactivate rooms
/// - Rooms start as ACTIVE by default
/// - State is idempotent (activating an already-active room is a no-op)
/// </summary>
public sealed class ConsultingRoom : AggregateRoot
{
    public string RoomName { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public string? CurrentPatientId { get; private set; }
    public DateTime? AttentionStartedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime LastModifiedAt { get; private set; }

    private ConsultingRoom() { }

    /// <summary>
    /// Factory: Creates a new ConsultingRoom (default: ACTIVE).
    /// </summary>
    public static ConsultingRoom Create(
        string roomId,
        string roomName,
        EventMetadata metadata)
    {
        ConsultingRoomInvariants.ValidateRoomName(roomName);

        var room = new ConsultingRoom();

        var @event = new ConsultingRoomCreated
        {
            Metadata = metadata.WithVersion(room.Version + 1),
            RoomId = roomId,
            RoomName = roomName,
            IsActive = true, // Default: ACTIVE
            CreatedAt = metadata.OccurredAt
        };

        room.RaiseEvent(@event);
        return room;
    }

    /// <summary>
    /// Command: Activates the room (admin only).
    /// </summary>
    public void Activate(ActivateConsultingRoomRequest request)
    {
        if (IsActive)
            return; // Idempotent: already active

        var @event = new ConsultingRoomActivated
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            RoomId = Id,
            ActivatedAt = request.OccurredAt,
            ActivatedBy = request.AdminId
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Command: Deactivates the room (admin only).
    /// </summary>
    public void Deactivate(DeactivateConsultingRoomRequest request)
    {
        if (!IsActive)
            return; // Idempotent: already inactive

        ConsultingRoomInvariants.ValidateRoomNotOccupied(CurrentPatientId);

        var @event = new ConsultingRoomDeactivated
        {
            Metadata = request.Metadata.WithVersion(Version + 1),
            RoomId = Id,
            DeactivatedAt = request.OccurredAt,
            DeactivatedBy = request.AdminId
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Internal event: Called when a patient is assigned to this room.
    /// </summary>
    public void StudentBeingServed(string patientId, DateTime occuredAt, 
        EventMetadata metadata)
    {
        ConsultingRoomInvariants.ValidateRoomIsActive(IsActive);
        ConsultingRoomInvariants.ValidateRoomNotOccupied(CurrentPatientId);

        var @event = new ConsultingRoomPatientAssigned
        {
            Metadata = metadata.WithVersion(Version + 1),
            RoomId = Id,
            PatientId = patientId,
            AssignedAt = occuredAt
        };

        RaiseEvent(@event);
    }

    /// <summary>
    /// Internal event: Called when consultation in this room finishes.
    /// </summary>
    public void PatientLeftConsultation(string patientId, DateTime occuredAt, 
        EventMetadata metadata)
    {
        if (CurrentPatientId != patientId)
            throw new DomainException(
                $"Patient {patientId} is not being attended in room {Id}");

        var @event = new ConsultingRoomPatientLeft
        {
            Metadata = metadata.WithVersion(Version + 1),
            RoomId = Id,
            PatientId = patientId,
            LeftAt = occuredAt
        };

        RaiseEvent(@event);
    }

    // ===== EVENT HANDLERS =====

    public void Apply(ConsultingRoomCreated @event)
    {
        Id = @event.RoomId;
        RoomName = @event.RoomName;
        IsActive = @event.IsActive;
        CreatedAt = @event.CreatedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(ConsultingRoomActivated @event)
    {
        IsActive = true;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(ConsultingRoomDeactivated @event)
    {
        IsActive = false;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(ConsultingRoomPatientAssigned @event)
    {
        CurrentPatientId = @event.PatientId;
        AttentionStartedAt = @event.AssignedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }

    public void Apply(ConsultingRoomPatientLeft @event)
    {
        CurrentPatientId = null;
        AttentionStartedAt = null;
        LastModifiedAt = @event.Metadata.OccurredAt;
        Version = @event.Metadata.Version;
    }
}
```

---

### 1.3 Nuevos Value Objects

```csharp
// ===== PatientIdentity.cs =====
namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Immutable value object representing patient's legal identity (cedula/ID).
/// This is the primary identity for trazability and medical records.
/// </summary>
public sealed class PatientIdentity : ValueObject
{
    public string Value { get; }

    public PatientIdentity(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Patient identity cannot be empty");

        if (value.Length < 6 || value.Length > 20)
            throw new DomainException("Patient identity must be between 6 and 20 characters");

        Value = value.Trim().ToUpperInvariant();
    }

    protected override IEnumerable<object?> GetAtomicValues()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}

// ===== ConsultingRoomId.cs =====
namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Value object for consulting room identifiers.
/// Format: ROOM-XXX
/// </summary>
public sealed class ConsultingRoomId : ValueObject
{
    public string Value { get; }

    public ConsultingRoomId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Consulting room ID cannot be empty");

        if (!value.StartsWith("ROOM-"))
            throw new DomainException("Consulting room ID must start with 'ROOM-'");

        Value = value.Trim().ToUpperInvariant();
    }

    protected override IEnumerable<object?> GetAtomicValues()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}

// ===== PaymentAmount.cs =====
namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Value object for payment amounts (currency).
/// Ensures non-negative, valid amounts.
/// </summary>
public sealed class PaymentAmount : ValueObject
{
    public decimal Value { get; }

    public PaymentAmount(decimal value)
    {
        if (value <= 0)
            throw new DomainException("Payment amount must be greater than 0");

        if (value > 1_000_000)
            throw new DomainException("Payment amount cannot exceed 1,000,000");

        Value = value;
    }

    protected override IEnumerable<object?> GetAtomicValues()
    {
        yield return Value;
    }

    public override string ToString() => Value.ToString("C2");
}
```

---

## Esquema SQL Nueva {#schema-sql}

### Cambios en el Event Store

```sql
-- =============================================================================
-- RLAPP PostgreSQL Schema (REFACTORED)
-- Patient-centric Event Store + ConsultingRoom Aggregate
-- =============================================================================

-- =============================================================================
-- EVENT STORE (NO CHANGES IN STRUCTURE, BUT NEW AGGREGATE_IDs)
-- =============================================================================

-- Same table, but now:
-- - patient-* aggregate_ids for Patient aggregate events
-- - room-* aggregate_ids for ConsultingRoom aggregate events

CREATE TABLE IF NOT EXISTS waiting_room_events (
    event_id UUID PRIMARY KEY,
    aggregate_id TEXT NOT NULL,           -- patientId or roomId (no more queueId)
    aggregate_type TEXT NOT NULL,         -- 'Patient' or 'ConsultingRoom'
    version BIGINT NOT NULL,
    event_name TEXT NOT NULL,             -- PatientRegistered, PatientConsultingRoomAssigned, etc.
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NOT NULL,
    actor TEXT NOT NULL,                  -- Receptionist, Doctor, Cashier, etc.
    idempotency_key TEXT NOT NULL,
    schema_version INT NOT NULL,
    payload JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_events_aggregate_version
    ON waiting_room_events (aggregate_id, version);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_events_idempotency
    ON waiting_room_events (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_waiting_room_events_aggregate_type
    ON waiting_room_events (aggregate_type);

CREATE INDEX IF NOT EXISTS ix_waiting_room_events_event_name
    ON waiting_room_events (event_name);

-- =============================================================================
-- OUTBOX PATTERN TABLE (UNCHANGED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_outbox (
    outbox_id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    event_name TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,                 -- PENDING, PUBLISHED, FAILED
    attempts INT NOT NULL,
    next_attempt_at TIMESTAMPTZ NULL,
    last_error TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_outbox_event
    ON waiting_room_outbox (event_id);

CREATE INDEX IF NOT EXISTS ix_waiting_room_outbox_pending
    ON waiting_room_outbox (status, next_attempt_at);

-- =============================================================================
-- PATIENT IDENTITY REGISTRY (UNCHANGED STRUCTURE, EXPANDED USE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_patients (
    patient_id TEXT PRIMARY KEY,          -- UUID, generated by backend
    patient_identity TEXT NOT NULL,       -- Cedula/ID (unique legal identity)
    patient_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_patients_identity
    ON waiting_room_patients (patient_identity);

-- =============================================================================
-- CONSULTING ROOMS TABLE (NEW - persistent reference)
-- =============================================================================

CREATE TABLE IF NOT EXISTS consulting_rooms (
    room_id TEXT PRIMARY KEY,             -- ROOM-001, ROOM-002, etc.
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_consulting_rooms_is_active
    ON consulting_rooms (is_active);

-- =============================================================================
-- PROJECTION CHECKPOINTS (UNCHANGED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS projection_checkpoints (
    projection_id TEXT PRIMARY KEY,
    last_event_version BIGINT NOT NULL DEFAULT 0,
    checkpointed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key TEXT NOT NULL,
    status TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_projection_checkpoints_idempotency
    ON projection_checkpoints (idempotency_key);

-- =============================================================================
-- EVENT PROCESSING LAG MONITORING (UNCHANGED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_processing_lag (
    event_id UUID PRIMARY KEY,
    event_name TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_created_at TIMESTAMPTZ NOT NULL,
    event_published_at TIMESTAMPTZ,
    projection_processed_at TIMESTAMPTZ,
    outbox_dispatch_duration_ms INT,
    projection_processing_duration_ms INT,
    total_lag_ms INT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_name_lag ON event_processing_lag(event_name);
CREATE INDEX IF NOT EXISTS idx_status_lag ON event_processing_lag(status);
CREATE INDEX IF NOT EXISTS idx_aggregate_type_lag ON event_processing_lag(aggregate_type);

-- =============================================================================
-- READ MODELS / PROJECTIONS (REFACTORED)
-- =============================================================================

-- ===== PATIENT STATE VIEW (NEW) =====
-- This projection provides the read model for patient state queries.
-- One row per patient with current state denormalized.

CREATE TABLE IF NOT EXISTS patients_state_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL UNIQUE,
    patient_name VARCHAR(255) NOT NULL,
    current_state VARCHAR(50) NOT NULL,    -- REGISTERED, WAITING, ASSIGNED, etc.
    waiting_started_at TIMESTAMPTZ,
    assigned_room_id TEXT,
    consultation_started_at TIMESTAMPTZ,
    consultation_finished_at TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    payment_attempts INT DEFAULT 0,
    payment_validated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    leave_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    last_modified_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_identity
    ON patients_state_view (patient_identity);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_current_state
    ON patients_state_view (current_state);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_assigned_room_id
    ON patients_state_view (assigned_room_id);

-- ===== WAITING ROOM DISPLAY VIEW (NEW) =====
-- Optimized for public display screens (waiting room).
-- Shows patients currently waiting with minimal info.

CREATE TABLE IF NOT EXISTS waiting_room_display_view (
    patient_id TEXT NOT NULL,
    patient_identity TEXT NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    waiting_position INT,
    waiting_time_minutes INT,
    created_date_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (patient_id)
);

CREATE INDEX IF NOT EXISTS idx_waiting_room_display_state
    ON waiting_room_display_view (state);

CREATE INDEX IF NOT EXISTS idx_waiting_room_display_waiting_position
    ON waiting_room_display_view (waiting_position);

-- ===== CONSULTING ROOM OCCUPANCY VIEW (NEW) =====
-- Real-time view of which rooms are occupied and by whom.

CREATE TABLE IF NOT EXISTS consulting_room_occupancy_view (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    current_patient_id TEXT,
    patient_name VARCHAR(255),
    attention_started_at TIMESTAMPTZ,
    attention_duration_seconds INT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consulting_room_occupancy_is_active
    ON consulting_room_occupancy_view (is_active);

CREATE INDEX IF NOT EXISTS idx_consulting_room_occupancy_current_patient_id
    ON consulting_room_occupancy_view (current_patient_id);

-- ===== CASHIER QUEUE VIEW (NEW) =====
-- Patients in AT_CASHIER state, awaiting payment validation.

CREATE TABLE IF NOT EXISTS cashier_queue_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    arrived_at_cashier_at TIMESTAMPTZ NOT NULL,
    payment_attempts INT DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cashier_queue_arrived_at
    ON cashier_queue_view (arrived_at_cashier_at);

-- ===== COMPLETED PATIENTS VIEW (ARCHIVE) =====
-- Historical archive of completed patient processes.

CREATE TABLE IF NOT EXISTS completed_patients_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,          -- COMPLETED, ABSENT_AT_CONSULTATION, etc.
    total_wait_time_minutes INT,
    consultation_duration_minutes INT,
    payment_amount DECIMAL(10, 2),
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_completed_patients_status
    ON completed_patients_view (status);

CREATE INDEX IF NOT EXISTS idx_completed_patients_completed_at
    ON completed_patients_view (completed_at DESC);
```

---

## Nuevos Eventos de Dominio {#eventos-nuevos}

### Ciclo de Vida del Paciente

```csharp
// ===== PatientRegistered.cs =====
namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

public sealed class PatientRegistered : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public string PatientIdentity { get; init; } = null!;  // cedula/ID
    public string PatientName { get; init; } = null!;
    public string? PhoneNumber { get; init; }
    public DateTime RegisteredAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
        if (string.IsNullOrWhiteSpace(PatientIdentity))
            throw new InvalidOperationException("PatientIdentity is required");
        if (string.IsNullOrWhiteSpace(PatientName))
            throw new InvalidOperationException("PatientName is required");
    }
}

// ===== PatientMarkedAsWaiting.cs =====
public sealed class PatientMarkedAsWaiting : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public DateTime WaitingStartedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== PatientConsultingRoomAssigned.cs =====
public sealed class PatientConsultingRoomAssigned : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public string ConsultingRoomId { get; init; } = null!;
    public DateTime AssignedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
        if (string.IsNullOrWhiteSpace(ConsultingRoomId))
            throw new InvalidOperationException("ConsultingRoomId is required");
    }
}

// ===== PatientConsultationStarted.cs =====
public sealed class PatientConsultationStarted : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public string ConsultingRoomId { get; init; } = null!;
    public DateTime StartedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== PatientConsultationFinished.cs =====
public sealed class PatientConsultationFinished : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public string ConsultingRoomId { get; init; } = null!;
    public DateTime FinishedAt { get; init; }
    public string? Notes { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== PatientArrivedAtCashier.cs =====
public sealed class PatientArrivedAtCashier : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public decimal PaymentAmount { get; init; }
    public DateTime ArrivedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
        if (PaymentAmount <= 0)
            throw new InvalidOperationException("PaymentAmount must be > 0");
    }
}

// ===== PatientPaymentValidated.cs =====
public sealed class PatientPaymentValidated : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public DateTime ValidatedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== PatientCompleted.cs =====
public sealed class PatientCompleted : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public DateTime CompletedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== PatientMarkedAbsentAtConsultation.cs =====
public sealed class PatientMarkedAbsentAtConsultation : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public string? ConsultingRoomId { get; init; }
    public DateTime MarkedAbsentAt { get; init; }
    public string? Reason { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== PatientMarkedAbsentAtCashier.cs =====
public sealed class PatientMarkedAbsentAtCashier : DomainEvent
{
    public string PatientId { get; init; } = null!;
    public DateTime MarkedAbsentAt { get; init; }
    public string? Reason { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}
```

### Ciclo de Vida de la Sala de Consulta

```csharp
// ===== ConsultingRoomCreated.cs =====
namespace WaitingRoom.Domain.Events;

public sealed class ConsultingRoomCreated : DomainEvent
{
    public string RoomId { get; init; } = null!;
    public string RoomName { get; init; } = null!;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(RoomId))
            throw new InvalidOperationException("RoomId is required");
        if (string.IsNullOrWhiteSpace(RoomName))
            throw new InvalidOperationException("RoomName is required");
    }
}

// ===== ConsultingRoomActivated.cs =====
public sealed class ConsultingRoomActivated : DomainEvent
{
    public string RoomId { get; init; } = null!;
    public DateTime ActivatedAt { get; init; }
    public string ActivatedBy { get; init; } = null!;

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(RoomId))
            throw new InvalidOperationException("RoomId is required");
    }
}

// ===== ConsultingRoomDeactivated.cs =====
public sealed class ConsultingRoomDeactivated : DomainEvent
{
    public string RoomId { get; init; } = null!;
    public DateTime DeactivatedAt { get; init; }
    public string DeactivatedBy { get; init; } = null!;

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(RoomId))
            throw new InvalidOperationException("RoomId is required");
    }
}

// ===== ConsultingRoomPatientAssigned.cs =====
public sealed class ConsultingRoomPatientAssigned : DomainEvent
{
    public string RoomId { get; init; } = null!;
    public string PatientId { get; init; } = null!;
    public DateTime AssignedAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(RoomId))
            throw new InvalidOperationException("RoomId is required");
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}

// ===== ConsultingRoomPatientLeft.cs =====
public sealed class ConsultingRoomPatientLeft : DomainEvent
{
    public string RoomId { get; init; } = null!;
    public string PatientId { get; init; } = null!;
    public DateTime LeftAt { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(RoomId))
            throw new InvalidOperationException("RoomId is required");
        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}
```

---

## Proyecciones Rediseñadas {#proyecciones}

### Projection Handler: PatientStateProjection

```csharp
namespace WaitingRoom.Projections.Handlers;

using WaitingRoom.Domain.Events;
using WaitingRoom.Infrastructure.Persistence;

/// <summary>
/// Projects domain events into patients_state_view read model.
/// Provides a denormalized, queryable view of patient state at any point in time.
/// </summary>
public sealed class PatientStateProjectionHandler : IProjectionHandler
{
    private readonly IPatientStateRepository _repository;

    public PatientStateProjectionHandler(IPatientStateRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task HandleAsync(PatientRegistered @event)
    {
        var patientState = new PatientStateReadModel
        {
            PatientId = @event.PatientId,
            PatientIdentity = @event.PatientIdentity,
            PatientName = @event.PatientName,
            CurrentState = "Registered",
            CreatedAt = @event.RegisteredAt,
            LastModifiedAt = @event.Metadata.OccurredAt,
            UpdatedByEventVersion = @event.Metadata.Version
        };

        await _repository.SaveAsync(patientState);
    }

    public async Task HandleAsync(PatientMarkedAsWaiting @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "Waiting";
        patientState.WaitingStartedAt = @event.WaitingStartedAt;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    public async Task HandleAsync(PatientConsultingRoomAssigned @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "Assigned";
        patientState.AssignedRoomId = @event.ConsultingRoomId;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    public async Task HandleAsync(PatientConsultationStarted @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "InConsultation";
        patientState.ConsultationStartedAt = @event.StartedAt;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    public async Task HandleAsync(PatientConsultationFinished @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "FinishedConsultation";
        patientState.ConsultationFinishedAt = @event.FinishedAt;
        patientState.AssignedRoomId = null;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    public async Task HandleAsync(PatientArrivedAtCashier @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "AtCashier";
        patientState.PaymentAmount = @event.PaymentAmount;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    public async Task HandleAsync(PatientPaymentValidated @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "PaymentValidated";
        patientState.PaymentValidatedAt = @event.ValidatedAt;
        patientState.PaymentAttempts++;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    public async Task HandleAsync(PatientCompleted @event)
    {
        var patientState = await _repository.GetByIdAsync(@event.PatientId);
        if (patientState is null) throw new InvalidOperationException($"Patient {@event.PatientId} not found");

        patientState.CurrentState = "Completed";
        patientState.CompletedAt = @event.CompletedAt;
        patientState.LastModifiedAt = @event.Metadata.OccurredAt;
        patientState.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(patientState);
    }

    // Similar handlers for absent/cancelled states...
}
```

### Projection Handler: ConsultingRoomOccupancyProjection

```csharp
namespace WaitingRoom.Projections.Handlers;

using WaitingRoom.Domain.Events;
using WaitingRoom.Infrastructure.Persistence;

/// <summary>
/// Projects ConsultingRoom events into consulting_room_occupancy_view.
/// Provides real-time visibility of room occupancy for dashboard and routing.
/// </summary>
public sealed class ConsultingRoomOccupancyProjectionHandler : IProjectionHandler
{
    private readonly IConsultingRoomOccupancyRepository _repository;

    public ConsultingRoomOccupancyProjectionHandler(IConsultingRoomOccupancyRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task HandleAsync(ConsultingRoomCreated @event)
    {
        var occupancy = new ConsultingRoomOccupancyReadModel
        {
            RoomId = @event.RoomId,
            RoomName = @event.RoomName,
            IsActive = @event.IsActive,
            CurrentPatientId = null,
            PatientName = null,
            AttentionStartedAt = null,
            UpdatedAt = @event.Metadata.OccurredAt,
            UpdatedByEventVersion = @event.Metadata.Version
        };

        await _repository.SaveAsync(occupancy);
    }

    public async Task HandleAsync(ConsultingRoomPatientAssigned @event)
    {
        var occupancy = await _repository.GetByIdAsync(@event.RoomId);
        if (occupancy is null) throw new InvalidOperationException($"Room {@event.RoomId} not found");

        occupancy.CurrentPatientId = @event.PatientId;
        occupancy.AttentionStartedAt = @event.AssignedAt;
        occupancy.UpdatedAt = @event.Metadata.OccurredAt;
        occupancy.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(occupancy);
    }

    public async Task HandleAsync(ConsultingRoomPatientLeft @event)
    {
        var occupancy = await _repository.GetByIdAsync(@event.RoomId);
        if (occupancy is null) throw new InvalidOperationException($"Room {@event.RoomId} not found");

        occupancy.CurrentPatientId = null;
        occupancy.AttentionStartedAt = null;
        occupancy.UpdatedAt = @event.Metadata.OccurredAt;
        occupancy.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(occupancy);
    }

    public async Task HandleAsync(ConsultingRoomActivated @event)
    {
        var occupancy = await _repository.GetByIdAsync(@event.RoomId);
        if (occupancy is null) throw new InvalidOperationException($"Room {@event.RoomId} not found");

        occupancy.IsActive = true;
        occupancy.UpdatedAt = @event.Metadata.OccurredAt;
        occupancy.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(occupancy);
    }

    public async Task HandleAsync(ConsultingRoomDeactivated @event)
    {
        var occupancy = await _repository.GetByIdAsync(@event.RoomId);
        if (occupancy is null) throw new InvalidOperationException($"Room {@event.RoomId} not found");

        occupancy.IsActive = false;
        occupancy.UpdatedAt = @event.Metadata.OccurredAt;
        occupancy.UpdatedByEventVersion = @event.Metadata.Version;

        await _repository.UpdateAsync(occupancy);
    }
}
```

---

## Checklist Fase 1 {#checklist-fase-1}

### Base de Datos
- [ ] Crear migración PostgreSQL con nuevo schema
  - [ ] Adicionar columna `aggregate_type` a `waiting_room_events`
  - [ ] Crear tabla `consulting_rooms`
  - [ ] Crear vistas de proyección (`patients_state_view`, `consulting_room_occupancy_view`, etc.)
  - [ ] Validar índices y constraints
  
- [ ] Migración de datos (si existen datos anteriores)
  - [ ] Mapear `queueId` → `patientId` en eventos históricos
  - [ ] Resincronizar proyecciones desde el event store
  
- [ ] Seed de datos
  - [ ] Crear N consultorios (ROOM-001, ROOM-002, etc.)
  - [ ] Crear ConsultingRoomCreated events por cada sala

### Dominio (.NET Backend)
- [ ] Crear agregado `Patient`
  - [ ] Implementar `PatientState` enum
  - [ ] Implementar métodos de comando (CheckIn, MarkAsWaiting, AssignRoom, etc.)
  - [ ] Implementar event handlers (Apply methods)
  
- [ ] Crear agregado `ConsultingRoom`
  - [ ] Implementar estado (IsActive, CurrentPatientId)
  - [ ] Implementar métodos Activate/Deactivate
  - [ ] Implementar PatientAssigned/PatientLeft
  
- [ ] Crear Value Objects
  - [ ] `PatientIdentity`
  - [ ] `ConsultingRoomId`
  - [ ] `PaymentAmount`
  
- [ ] Crear Invariants
  - [ ] `PatientInvariants` (validación de transiciones de estado)
  - [ ] `ConsultingRoomInvariants` (validación de ocupancia)
  
- [ ] Crear Events
  - [ ] 7+ eventos Patient (Registered, MarkedAsWaiting, AssignedRoom, etc.)
  - [ ] 5+ eventos ConsultingRoom (Created, Activated, Deactivated, PatientAssigned, PatientLeft)
  
- [ ] Crear Commands y DTOs
  - [ ] DTO para cada comando (CheckIn, Assign, Start, Finish, etc.)
  - [ ] Request objects para cada comando
  
### Proyecciones
- [ ] Crear `PatientStateProjectionHandler`
- [ ] Crear `ConsultingRoomOccupancyProjectionHandler`
- [ ] Crear repositorios para proyecciones
- [ ] Implementar SyncProjectionsOnRebuild

### Testing (Unitario + Integración)
- [ ] Tests para transiciones de estado de Patient
- [ ] Tests para validación de invariantes
- [ ] Tests de idempotencia (múltiples eventos idénticos)
- [ ] Tests de ConsultingRoom (estado, ocupancia)
- [ ] Integration tests: evento → proyección
- [ ] Integration tests: comando → evento → proyección

### Documentación
- [ ] Diagramas de flujo de estado (Patient, ConsultingRoom)
- [ ] Matriz de transiciones de estado válidas
- [ ] Especificación de eventos (schema de payload)
- [ ] Guía de migración (cómo mover datos de queueId → patientId)

---

## Próximas Fases (Preview)

### Fase 2: Refactorización Backend (CQRS + Handlers)
- CommandHandlers para Patient y ConsultingRoom
- QueryHandlers para lecturas
- Integración con Event Store  
- Actualización de endpoints API
- SignalR Hub refactorizado

### Fase 3: Refactorización Frontend (React + Hooks)
- Nuevo flujo UI: Registro → Recepción → Consultorio → Caja
- Componentes adaptados (sin nuevas pantallas)
- Hooks para Patient state
- Integración SignalR
- Actualización de stores

### Fase 4: Testing (Unit + Integration + E2E)
- Tests Backend (xUnit/NUnit)
- Tests Frontend (Jest/React Testing Library)
- Tests E2E (Cypress/Playwright)

### Fase 5: Documentación y Deploy
- README actualizado
- ADRs (Architecture Decision Records)
- Migration guide
- Deployment strategy

---

**Documento generado como referencia arquitectónica para refactorización de RLAPP.** 🚀

Autor: Senior Software Architect  
Fecha: 2026-03-19
