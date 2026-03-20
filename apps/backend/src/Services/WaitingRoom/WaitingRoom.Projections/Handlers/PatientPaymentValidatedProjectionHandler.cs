namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

public sealed class PatientPaymentValidatedProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientPaymentValidated);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientPaymentValidated evt)
            throw new ArgumentException($"Expected {nameof(PatientPaymentValidated)}, got {@event.GetType().Name}");

        if (context is not IAtencionProjectionContext atencionContext)
            throw new InvalidOperationException($"Context must implement {nameof(IAtencionProjectionContext)}");

        var serviceId = evt.ServiceId ?? "unknown-queue";
        var idempotencyKey = $"patient-payment-validated:{serviceId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var normalizedPriority = NormalizePriority(evt.Priority ?? "normal");

        await atencionContext.UpdateMonitorViewAsync(serviceId, normalizedPriority, "increment", cancellationToken);
        await atencionContext.AddPatientToQueueAsync(
            serviceId,
            new PatientInQueueDto
            {
                PatientId = evt.PatientId,
                PatientName = evt.PatientName ?? "Unknown",
                Priority = normalizedPriority,
                CheckInTime = evt.ValidatedAt,
                WaitTimeMinutes = 0,
                TurnNumber = evt.TurnNumber ?? 0
            },
            cancellationToken);

        await atencionContext.RemovePatientFromPaymentAsync(serviceId, evt.PatientId, cancellationToken);
        await atencionContext.SetNextTurnViewAsync(serviceId, null, cancellationToken);
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
