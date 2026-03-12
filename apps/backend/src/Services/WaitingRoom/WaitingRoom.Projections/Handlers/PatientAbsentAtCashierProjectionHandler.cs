namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

public sealed class PatientAbsentAtCashierProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientAbsentAtCashier);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientAbsentAtCashier evt)
            throw new ArgumentException($"Expected {nameof(PatientAbsentAtCashier)}, got {@event.GetType().Name}");

        if (context is not IWaitingRoomProjectionContext waitingContext)
            throw new InvalidOperationException($"Context must implement {nameof(IWaitingRoomProjectionContext)}");

        var idempotencyKey = $"patient-absent-cashier:{evt.QueueId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var currentTurn = await waitingContext.GetNextTurnViewAsync(evt.QueueId, cancellationToken);
        if (currentTurn != null && string.Equals(currentTurn.PatientId, evt.PatientId, StringComparison.OrdinalIgnoreCase))
        {
            await waitingContext.UpdateMonitorViewAsync(evt.QueueId, NormalizePriority(currentTurn.Priority), "increment", cancellationToken);
            await waitingContext.AddPatientToQueueAsync(
                evt.QueueId,
                new PatientInQueueDto
                {
                    PatientId = currentTurn.PatientId,
                    PatientName = currentTurn.PatientName,
                    Priority = NormalizePriority(currentTurn.Priority),
                    CheckInTime = currentTurn.CalledAt ?? currentTurn.ClaimedAt ?? evt.AbsentAt,
                    WaitTimeMinutes = 0
                },
                cancellationToken);
        }

        await waitingContext.SetNextTurnViewAsync(evt.QueueId, null, cancellationToken);
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