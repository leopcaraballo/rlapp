namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Doctor starts the consultation.
/// </summary>
public sealed record PatientConsultationStarted : DomainEvent
{
    public required string PatientId { get; init; }
    public required string ConsultingRoomId { get; init; }
    public required DateTime StartedAt { get; init; }

    public override string EventName => "PatientConsultationStarted";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
