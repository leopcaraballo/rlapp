namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;

public sealed class PatientCancelledByAbsenceProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientCancelledByAbsence);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientCancelledByAbsence evt)
            throw new ArgumentException($"Expected {nameof(PatientCancelledByAbsence)}, got {@event.GetType().Name}");

        if (context is not IWaitingRoomProjectionContext waitingContext)
            throw new InvalidOperationException($"Context must implement {nameof(IWaitingRoomProjectionContext)}");

        var idempotencyKey = $"patient-cancelled-absence:{evt.QueueId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        await waitingContext.SetNextTurnViewAsync(evt.QueueId, null, cancellationToken);
        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }
}