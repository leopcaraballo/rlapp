namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Patient left consulting room.
/// </summary>
public sealed record ConsultingRoomPatientLeft : DomainEvent
{
    public required string RoomId { get; init; }
    public required string PatientId { get; init; }
    public required DateTime LeftAt { get; init; }

    public override string EventName => "ConsultingRoomPatientLeft";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(RoomId)) throw new InvalidOperationException("RoomId is required");
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
