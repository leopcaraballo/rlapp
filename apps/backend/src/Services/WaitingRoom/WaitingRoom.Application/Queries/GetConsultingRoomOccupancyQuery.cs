namespace WaitingRoom.Application.Queries;

using MediatR;

public sealed record GetConsultingRoomOccupancyQuery() : IRequest<IEnumerable<ConsultingRoomOccupancyResponse>>;

public sealed record ConsultingRoomOccupancyResponse
{
    public required string RoomId { get; init; }
    public required string RoomName { get; init; }
    public bool IsActive { get; init; }
    public string? CurrentPatientId { get; init; }
    public string? CurrentPatientName { get; init; }
}
