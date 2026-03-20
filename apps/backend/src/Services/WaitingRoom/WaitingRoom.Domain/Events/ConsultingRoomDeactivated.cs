namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Consulting room deactivated.
/// </summary>
public sealed record ConsultingRoomDeactivated : DomainEvent
{
    public required string RoomId { get; init; }
    public string? ServiceId { get; init; }
    public required DateTime DeactivatedAt { get; init; }
    public required string DeactivatedBy { get; init; }

    public override string EventName => "ConsultingRoomDeactivated";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(RoomId)) throw new InvalidOperationException("RoomId is required");
    }
}
