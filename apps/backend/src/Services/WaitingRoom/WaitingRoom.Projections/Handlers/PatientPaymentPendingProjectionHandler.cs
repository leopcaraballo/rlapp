namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

public sealed class PatientPaymentPendingProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientPaymentPending);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientPaymentPending evt)
            throw new ArgumentException($"Expected {nameof(PatientPaymentPending)}, got {@event.GetType().Name}");

        if (context is not IWaitingRoomProjectionContext waitingContext)
            throw new InvalidOperationException($"Context must implement {nameof(IWaitingRoomProjectionContext)}");

        var idempotencyKey = $"patient-payment-pending:{evt.QueueId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var currentTurn = await waitingContext.GetNextTurnViewAsync(evt.QueueId, cancellationToken);

        var updatedTurn = currentTurn != null && string.Equals(currentTurn.PatientId, evt.PatientId, StringComparison.OrdinalIgnoreCase)
            ? currentTurn with
            {
                Status = "payment-pending",
                ProjectedAt = DateTimeOffset.UtcNow
            }
            : new NextTurnView
            {
                QueueId = evt.QueueId,
                PatientId = evt.PatientId,
                PatientName = evt.PatientName,
                Priority = NormalizePriority(evt.Priority),
                ConsultationType = evt.ConsultationType,
                Status = "payment-pending",
                ClaimedAt = evt.PendingAt,
                CalledAt = evt.PendingAt,
                ProjectedAt = DateTimeOffset.UtcNow
            };

        await waitingContext.SetNextTurnViewAsync(evt.QueueId, updatedTurn, cancellationToken);
        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }

    private static string NormalizePriority(string priority)
    {
        var normalized = priority.Trim().ToLowerInvariant();

        return normalized switch
        {
            "urgent" => "high",
            "high" => "high",
            "medium" => "normal",
            "normal" => "normal",
            "low" => "low",
            _ => normalized
        };
    }
}