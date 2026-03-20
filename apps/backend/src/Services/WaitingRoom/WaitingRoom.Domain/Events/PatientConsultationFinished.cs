namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Doctor finishes the consultation.
/// </summary>
public sealed record PatientConsultationFinished : DomainEvent
{
    public required string PatientId { get; init; }
    public required string ConsultingRoomId { get; init; }
    public required DateTime FinishedAt { get; init; }
    public string? Notes { get; init; }

    public override string EventName => "PatientConsultationFinished";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
