namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Patient marked as absent during consultation.
/// </summary>
public sealed record PatientMarkedAbsentAtConsultation : DomainEvent
{
    public required string PatientId { get; init; }
    public string? ConsultingRoomId { get; init; }
    public required DateTime MarkedAbsentAt { get; init; }
    public string? Reason { get; init; }

    public override string EventName => "PatientMarkedAbsentAtConsultation";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
