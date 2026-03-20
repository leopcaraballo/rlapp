namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;

public sealed class PatientCalledProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientCalled);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientCalled evt)
            throw new ArgumentException($"Expected {nameof(PatientCalled)}, got {@event.GetType().Name}");

        if (context is not IAtencionProjectionContext atencionContext)
            throw new InvalidOperationException($"Context must implement {nameof(IAtencionProjectionContext)}");

        var idempotencyKey = $"patient-called:{evt.ServiceId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var currentTurn = await atencionContext.GetNextTurnViewAsync(evt.ServiceId, cancellationToken);
        if (currentTurn != null && string.Equals(currentTurn.PatientId, evt.PatientId, StringComparison.OrdinalIgnoreCase))
        {
            var updatedTurn = currentTurn with
            {
                Status = "called",
                CalledAt = evt.CalledAt,
                ProjectedAt = DateTimeOffset.UtcNow
            };

            await atencionContext.SetNextTurnViewAsync(evt.ServiceId, updatedTurn, cancellationToken);
            
            // ✅ Move from Waiting to Consultation in the "Full State" view
            await atencionContext.RemovePatientFromQueueAsync(evt.ServiceId, evt.PatientId, cancellationToken);
            await atencionContext.AddPatientToConsultationAsync(evt.ServiceId, updatedTurn, cancellationToken);
        }

        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }
}
