namespace WaitingRoom.Domain.Aggregates;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Domain.Invariants;
using WaitingRoom.Domain.Exceptions;

/// <summary>
/// Aggregate Root: Patient
/// Represents the complete lifecycle of a patient in the waiting room system.
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
    public string? LeaveReason { get; private set; }

    private Patient() { }

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
            PatientIdentity = identity.Value,
            PatientName = patientName.Trim(),
            PhoneNumber = phoneNumber,
            RegisteredAt = metadata.OccurredAt
        };

        patient.RaiseEvent(@event);
        return patient;
    }

    public void MarkAsWaiting(EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.Waiting);

        var @event = new PatientMarkedAsWaiting
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            WaitingStartedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void AssignConsultingRoom(string consultingRoomId, bool isRoomActive, EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.Assigned);
        PatientInvariants.ValidateConsultingRoomId(consultingRoomId);
        
        if (!isRoomActive)
            throw new DomainException($"Consulting room {consultingRoomId} is not active");

        var @event = new PatientConsultingRoomAssigned
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = consultingRoomId,
            AssignedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void StartConsultation(EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.InConsultation);

        var @event = new PatientConsultationStarted
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = AssignedConsultingRoomId 
                ?? throw new DomainException("Patient has no assigned consulting room"),
            StartedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void FinishConsultation(string? notes, EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.FinishedConsultation);

        var @event = new PatientConsultationFinished
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = AssignedConsultingRoomId 
                ?? throw new DomainException("Patient has no assigned consulting room"),
            FinishedAt = metadata.OccurredAt,
            Notes = notes
        };

        RaiseEvent(@event);
    }

    public void ArriveCashier(decimal paymentAmount, EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.AtCashier);
        PatientInvariants.ValidatePaymentAmount(paymentAmount);

        var @event = new PatientArrivedAtCashier
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            PaymentAmount = paymentAmount,
            ArrivedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void ValidatePayment(EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.PaymentValidated);

        var @event = new PatientPaymentValidated
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            ValidatedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void Complete(EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransition(CurrentState, PatientState.Completed);

        var @event = new PatientCompleted
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            CompletedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void MarkAbsentAtConsultation(string? reason, EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransitionToTerminal(CurrentState, PatientState.AbsentAtConsultation);

        var @event = new PatientMarkedAbsentAtConsultation
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            ConsultingRoomId = AssignedConsultingRoomId,
            MarkedAbsentAt = metadata.OccurredAt,
            Reason = reason
        };

        RaiseEvent(@event);
    }

    public void MarkAbsentAtCashier(string? reason, EventMetadata metadata)
    {
        PatientInvariants.ValidateStateTransitionToTerminal(CurrentState, PatientState.AbsentAtCashier);

        var @event = new PatientMarkedAbsentAtCashier
        {
            Metadata = metadata.WithVersion(Version + 1),
            PatientId = Id,
            MarkedAbsentAt = metadata.OccurredAt,
            Reason = reason
        };

        RaiseEvent(@event);
    }

    // ===== EVENT HANDLERS (APPLIED TO STATE) =====

    private void When(PatientRegistered @event)
    {
        Id = @event.PatientId;
        Identity = new PatientIdentity(@event.PatientIdentity);
        PatientName = @event.PatientName;
        PhoneNumber = @event.PhoneNumber;
        CurrentState = PatientState.Registered;
        CreatedAt = @event.RegisteredAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientMarkedAsWaiting @event)
    {
        CurrentState = PatientState.Waiting;
        WaitingStartedAt = @event.WaitingStartedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientConsultingRoomAssigned @event)
    {
        CurrentState = PatientState.Assigned;
        AssignedConsultingRoomId = @event.ConsultingRoomId;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientConsultationStarted @event)
    {
        CurrentState = PatientState.InConsultation;
        ConsultationStartedAt = @event.StartedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientConsultationFinished @event)
    {
        CurrentState = PatientState.FinishedConsultation;
        ConsultationFinishedAt = @event.FinishedAt;
        AssignedConsultingRoomId = null;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientArrivedAtCashier @event)
    {
        CurrentState = PatientState.AtCashier;
        PaymentAmount = @event.PaymentAmount;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientPaymentValidated @event)
    {
        CurrentState = PatientState.PaymentValidated;
        PaymentValidatedAt = @event.ValidatedAt;
        PaymentAttempts++;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientCompleted @event)
    {
        CurrentState = PatientState.Completed;
        CompletedAt = @event.CompletedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientMarkedAbsentAtConsultation @event)
    {
        CurrentState = PatientState.AbsentAtConsultation;
        LeaveReason = @event.Reason;
        AssignedConsultingRoomId = null;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(PatientMarkedAbsentAtCashier @event)
    {
        CurrentState = PatientState.AbsentAtCashier;
        LeaveReason = @event.Reason;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }
}

public enum PatientState
{
    Unknown = 0,
    Registered = 1,
    Waiting = 2,
    Assigned = 3,
    InConsultation = 4,
    FinishedConsultation = 5,
    AtCashier = 6,
    PaymentValidated = 7,
    Completed = 8,
    AbsentAtConsultation = 9,
    AbsentAtCashier = 10,
    CancelledByPayment = 11
}
