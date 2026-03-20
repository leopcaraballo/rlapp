namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

public sealed class PatientAttentionCompletedProjectionHandler : IProjectionHandler
{
    public string EventName => nameof(PatientAttentionCompleted);

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        if (@event is not PatientAttentionCompleted evt)
            throw new ArgumentException($"Expected {nameof(PatientAttentionCompleted)}, got {@event.GetType().Name}");

        if (context is not IAtencionProjectionContext atencionContext)
            throw new InvalidOperationException($"Context must implement {nameof(IAtencionProjectionContext)}");

        var idempotencyKey = $"patient-attention-completed:{evt.ServiceId}:{evt.Metadata.AggregateId}:{evt.Metadata.EventId}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        await atencionContext.SetNextTurnViewAsync(evt.ServiceId, null, cancellationToken);

        // ✅ Move from Consultation to Payment in the "Full State" view
        await atencionContext.RemovePatientFromConsultationAsync(evt.ServiceId, evt.PatientId, cancellationToken);
        
        var payingPatient = new NextTurnView
        {
            ServiceId = evt.ServiceId,
            PatientId = evt.PatientId,
            PatientName = evt.PatientName,
            Priority = NormalizePriority(evt.Priority),
            ConsultationType = evt.ConsultationType,
            Status = "waiting-payment",
            TurnNumber = 0, // DTO simplification
            ProjectedAt = DateTimeOffset.UtcNow
        };
        await atencionContext.AddPatientToPaymentAsync(evt.ServiceId, payingPatient, cancellationToken);

        await atencionContext.AddRecentAttentionRecordAsync(
            evt.ServiceId,
            new RecentAttentionRecordView
            {
                ServiceId = evt.ServiceId,
                PatientId = evt.PatientId,
                PatientName = evt.PatientName,
                Priority = NormalizePriority(evt.Priority),
                ConsultationType = evt.ConsultationType,
                CompletedAt = evt.CompletedAt,
                Outcome = evt.Outcome,
                Notes = evt.Notes
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
