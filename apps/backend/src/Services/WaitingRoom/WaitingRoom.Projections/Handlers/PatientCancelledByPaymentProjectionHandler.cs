namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;

public sealed class PatientCancelledByPaymentProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientCancelledByPayment);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientCancelledByPayment evt)
            throw new ArgumentException($"Expected {nameof(PatientCancelledByPayment)}, got {@event.GetType().Name}");

        if (context is not IWaitingRoomProjectionContext waitingContext)
            throw new InvalidOperationException($"Context must implement {nameof(IWaitingRoomProjectionContext)}");

        var idempotencyKey = $"patient-cancelled-payment:{evt.QueueId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        await waitingContext.SetNextTurnViewAsync(evt.QueueId, null, cancellationToken);
        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }
}