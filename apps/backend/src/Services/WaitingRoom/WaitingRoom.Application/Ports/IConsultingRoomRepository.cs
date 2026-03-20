namespace WaitingRoom.Application.Ports;

using WaitingRoom.Domain.Aggregates;

/// <summary>
/// Repository for ConsultingRoom aggregate.
/// </summary>
public interface IConsultingRoomRepository
{
    Task<ConsultingRoom?> GetByIdAsync(string roomId, CancellationToken ct = default);
    Task SaveAsync(ConsultingRoom room, CancellationToken ct = default);
}
