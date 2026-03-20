namespace WaitingRoom.Application.Ports;

/// <summary>
/// Port for Consulting Room Occupancy read model (PostgreSQL).
/// </summary>
public interface IConsultingRoomOccupancyRepository
{
    Task UpsertAsync(ConsultingRoomOccupancyRow row, CancellationToken ct = default);
    Task<ConsultingRoomOccupancyRow?> GetByIdAsync(string roomId, CancellationToken ct = default);
    Task<IEnumerable<ConsultingRoomOccupancyRow>> GetAllAsync(CancellationToken ct = default);
}

public sealed record ConsultingRoomOccupancyRow
{
    public required string RoomId { get; init; }
    public required string RoomName { get; init; }
    public required bool IsActive { get; init; }
    public string? CurrentPatientId { get; init; }
    public string? PatientName { get; init; }
    public DateTime? AttentionStartedAt { get; init; }
    public int? AttentionDurationSeconds { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required long UpdatedByEventVersion { get; init; }
}
