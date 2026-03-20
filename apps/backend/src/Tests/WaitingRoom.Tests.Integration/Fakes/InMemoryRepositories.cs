namespace WaitingRoom.Tests.Integration.Fakes;

using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Projections.Abstractions;
using BuildingBlocks.EventSourcing;

public sealed class InMemoryPatientStateRepository : IPatientStateRepository
{
    private readonly ConcurrentDictionary<string, PatientStateRow> _data = new();

    public Task UpsertAsync(PatientStateRow row, CancellationToken ct = default)
    {
        _data[row.PatientId] = row;
        return Task.CompletedTask;
    }

    public Task<PatientStateRow?> GetByIdAsync(string patientId, CancellationToken ct = default)
    {
        _data.TryGetValue(patientId, out var row);
        return Task.FromResult(row);
    }

    public Task<IEnumerable<PatientStateRow>> GetAllWaitingAsync(CancellationToken ct = default)
    {
        return Task.FromResult(_data.Values.Where(p => p.CurrentState == "EnEspera" || p.CurrentState == "EnTriaje").AsEnumerable());
    }
}

public sealed class InMemoryConsultingRoomOccupancyRepository : IConsultingRoomOccupancyRepository
{
    private readonly ConcurrentDictionary<string, ConsultingRoomOccupancyRow> _data = new();

    public Task UpsertAsync(ConsultingRoomOccupancyRow row, CancellationToken ct = default)
    {
        if (row.CurrentPatientId == null)
            _data.TryRemove(row.RoomId, out _);
        else
            _data[row.RoomId] = row;
            
        return Task.CompletedTask;
    }

    public Task<ConsultingRoomOccupancyRow?> GetByIdAsync(string roomId, CancellationToken ct = default)
    {
        _data.TryGetValue(roomId, out var row);
        return Task.FromResult(row);
    }

    public Task<IEnumerable<ConsultingRoomOccupancyRow>> GetAllAsync(CancellationToken ct = default)
    {
        return Task.FromResult(_data.Values.AsEnumerable());
    }
}

public sealed class InMemoryCashierQueueRepository : ICashierQueueRepository
{
    private readonly ConcurrentDictionary<string, CashierQueueRow> _data = new();

    public Task UpsertAsync(CashierQueueRow row, CancellationToken ct = default)
    {
        _data[row.PatientId] = row;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string patientId, CancellationToken ct = default)
    {
        _data.TryRemove(patientId, out _);
        return Task.CompletedTask;
    }

    public Task<CashierQueueRow?> GetByIdAsync(string patientId, CancellationToken ct = default)
    {
        _data.TryGetValue(patientId, out var row);
        return Task.FromResult(row);
    }

    public Task<IEnumerable<CashierQueueRow>> GetAllAsync(CancellationToken ct = default)
    {
        return Task.FromResult(_data.Values.OrderBy(p => p.ArrivedAtCashierAt).AsEnumerable());
    }
}

public sealed class InMemoryPatientRepository : IPatientRepository
{
    public Task<Patient?> GetByIdAsync(string patientId, CancellationToken ct = default)
    {
        return Task.FromResult<Patient?>(null);
    }

    public Task<Patient?> GetByIdentityAsync(string identity, CancellationToken ct = default)
    {
        return Task.FromResult<Patient?>(null);
    }

    public Task SaveAsync(Patient patient, CancellationToken ct = default) => Task.CompletedTask;
}

public sealed class InMemoryConsultingRoomRepository : IConsultingRoomRepository
{
    public Task<ConsultingRoom?> GetByIdAsync(string roomId, CancellationToken ct = default)
    {
        return Task.FromResult<ConsultingRoom?>(null);
    }

    public Task SaveAsync(ConsultingRoom room, CancellationToken ct = default) => Task.CompletedTask;
}

public sealed class InMemoryProjection : IProjection
{
    public string ProjectionId => "InMemory";
    public IReadOnlyList<IProjectionHandler> GetHandlers() => new List<IProjectionHandler>();
    public Task<ProjectionCheckpoint?> GetCheckpointAsync(CancellationToken ct = default) => Task.FromResult<ProjectionCheckpoint?>(null);
    public Task RebuildAsync(CancellationToken ct = default) => Task.CompletedTask;
    public Task ProcessEventAsync(DomainEvent @event, CancellationToken ct = default) => Task.CompletedTask;
    public Task ProcessEventsAsync(IEnumerable<DomainEvent> events, CancellationToken ct = default) => Task.CompletedTask;
}
