namespace WaitingRoom.Projections.Views;

public sealed record ConsultingRoomsView
{
    public required string ServiceId { get; init; }
    public required IReadOnlyList<string> ActiveRooms { get; init; }
    public required IReadOnlyList<string> AllRooms { get; init; }
    public DateTimeOffset ProjectedAt { get; init; } = DateTimeOffset.UtcNow;
}
