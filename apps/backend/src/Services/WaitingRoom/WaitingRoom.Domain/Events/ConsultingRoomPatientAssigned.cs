namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Patient assigned to room (internal room state).
/// </summary>
public sealed record ConsultingRoomPatientAssigned : DomainEvent
{
    public required string RoomId { get; init; }
    public required string PatientId { get; init; }
    public required DateTime AssignedAt { get; init; }

    public override string EventName => "ConsultingRoomPatientAssigned";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(RoomId)) throw new InvalidOperationException("RoomId is required");
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
