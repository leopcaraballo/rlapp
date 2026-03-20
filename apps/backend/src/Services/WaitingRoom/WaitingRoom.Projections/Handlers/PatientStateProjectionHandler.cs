namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Application.Ports;
using WaitingRoom.Projections.Abstractions;

/// <summary>
/// Consolidated projection handler for Patient-related events.
/// Updates the patients_state_view read model in PostgreSQL.
/// </summary>
public sealed class PatientStateProjectionHandler : IProjectionHandler
{
    private readonly IPatientStateRepository _repository;

    public string EventName => "PatientStateHandler"; // Not strictly used if registered manually for multiple events

    public PatientStateProjectionHandler(IPatientStateRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        // Deterministic idempotency key: aggregateId + eventVersion
        var idempotencyKey = $"patient-state:{@event.Metadata.AggregateId}:{@event.Metadata.Version}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var patientId = @event.Metadata.AggregateId;
        var currentRow = await _repository.GetByIdAsync(patientId, cancellationToken);

        var updatedRow = @event switch
        {
            PatientRegistered e => Handle(e),
            PatientMarkedAsWaiting e => Handle(e, currentRow),
            PatientConsultingRoomAssigned e => Handle(e, currentRow),
            PatientConsultationStarted e => Handle(e, currentRow),
            PatientConsultationFinished e => Handle(e, currentRow),
            PatientArrivedAtCashier e => Handle(e, currentRow),
            PatientPaymentValidated e => Handle(e, currentRow),
            PatientCompleted e => Handle(e, currentRow),
            PatientMarkedAbsentAtConsultation e => Handle(e, currentRow),
            PatientMarkedAbsentAtCashier e => Handle(e, currentRow),
            _ => currentRow
        };

        if (updatedRow != null && updatedRow != currentRow)
        {
            await _repository.UpsertAsync(updatedRow, cancellationToken);
        }

        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }

    private PatientStateRow Handle(PatientRegistered e) => new()
    {
        PatientId = e.PatientId,
        PatientIdentity = e.PatientIdentity,
        PatientName = e.PatientName,
        CurrentState = "Registered",
        CreatedAt = e.RegisteredAt,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientMarkedAsWaiting e, PatientStateRow? current) 
        => current == null ? null : current with
    {
        CurrentState = "Waiting",
        WaitingStartedAt = e.WaitingStartedAt,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientConsultingRoomAssigned e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "Assigned",
        AssignedRoomId = e.ConsultingRoomId,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientConsultationStarted e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "InConsultation",
        ConsultationStartedAt = e.StartedAt,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientConsultationFinished e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "FinishedConsultation",
        ConsultationFinishedAt = e.FinishedAt,
        AssignedRoomId = null,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientArrivedAtCashier e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "AtCashier",
        PaymentAmount = e.PaymentAmount,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientPaymentValidated e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "PaymentValidated",
        PaymentValidatedAt = e.ValidatedAt,
        PaymentAttempts = current.PaymentAttempts + 1,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientCompleted e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "Completed",
        CompletedAt = e.CompletedAt,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientMarkedAbsentAtConsultation e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "AbsentAtConsultation",
        LeaveReason = e.Reason,
        AssignedRoomId = null,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private PatientStateRow? Handle(PatientMarkedAbsentAtCashier e, PatientStateRow? current)
        => current == null ? null : current with
    {
        CurrentState = "AbsentAtCashier",
        LeaveReason = e.Reason,
        LastModifiedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };
}
