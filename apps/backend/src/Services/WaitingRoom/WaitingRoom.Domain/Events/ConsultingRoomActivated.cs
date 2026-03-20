namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Consulting room activated.
/// </summary>
public sealed record ConsultingRoomActivated : DomainEvent
{
    public required string RoomId { get; init; }
    public string? ServiceId { get; init; }
    public required DateTime ActivatedAt { get; init; }
    public required string ActivatedBy { get; init; }

    public override string EventName => "ConsultingRoomActivated";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(RoomId)) throw new InvalidOperationException("RoomId is required");
    }
}
