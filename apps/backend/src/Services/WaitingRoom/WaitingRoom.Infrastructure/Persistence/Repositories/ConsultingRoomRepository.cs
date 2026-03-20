namespace WaitingRoom.Infrastructure.Persistence.Repositories;

using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class ConsultingRoomRepository : IConsultingRoomRepository
{
    private readonly IEventStore _eventStore;

    public ConsultingRoomRepository(IEventStore eventStore)
    {
        _eventStore = eventStore ?? throw new ArgumentNullException(nameof(eventStore));
    }

    public Task<ConsultingRoom?> GetByIdAsync(string roomId, CancellationToken ct = default)
        => _eventStore.LoadAsync<ConsultingRoom>(roomId, ct);

    public Task SaveAsync(ConsultingRoom room, CancellationToken ct = default)
        => _eventStore.SaveAsync(room, ct);
}
