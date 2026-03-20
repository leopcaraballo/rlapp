namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Consulting room created.
/// </summary>
public sealed record ConsultingRoomCreated : DomainEvent
{
    public required string RoomId { get; init; }
    public required string RoomName { get; init; }
    public required bool IsActive { get; init; }
    public required DateTime CreatedAt { get; init; }

    public override string EventName => "ConsultingRoomCreated";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(RoomId)) throw new InvalidOperationException("RoomId is required");
        if (string.IsNullOrWhiteSpace(RoomName)) throw new InvalidOperationException("RoomName is required");
    }
}
