namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

public sealed class PatientCalledAtCashierProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientCalledAtCashier);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientCalledAtCashier evt)
            throw new ArgumentException($"Expected {nameof(PatientCalledAtCashier)}, got {@event.GetType().Name}");

        if (context is not IAtencionProjectionContext atencionContext)
            throw new InvalidOperationException($"Context must implement {nameof(IAtencionProjectionContext)}");

        var idempotencyKey = $"patient-called-cashier:{evt.ServiceId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var normalizedPriority = NormalizePriority(evt.Priority);

        await atencionContext.UpdateMonitorViewAsync(evt.ServiceId, normalizedPriority, "decrement", cancellationToken);
        await atencionContext.RemovePatientFromQueueAsync(evt.ServiceId, evt.PatientId, cancellationToken);

        await atencionContext.SetNextTurnViewAsync(
            evt.ServiceId,
            new NextTurnView
            {
                ServiceId = evt.ServiceId,
                PatientId = evt.PatientId,
                PatientName = evt.PatientName,
                Priority = normalizedPriority,
                ConsultationType = evt.ConsultationType,
                Status = "cashier-called",
                ClaimedAt = evt.CalledAt,
                CalledAt = evt.CalledAt,
                StationId = evt.CashierDeskId,
                TurnNumber = evt.TurnNumber,
                ProjectedAt = DateTimeOffset.UtcNow
            },
            cancellationToken);

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
