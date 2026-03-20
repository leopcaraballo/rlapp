namespace WaitingRoom.Infrastructure.Projections;

using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

/// <summary>
/// In-Memory implementation of projection context for "Atención".
///
/// Used during development and testing.
/// Production should use PostgreSQL implementation.
/// </summary>
public sealed class InMemoryAtencionProjectionContext : IAtencionProjectionContext
{
    private readonly ConcurrentDictionary<string, ProjectionCheckpoint> _checkpoints = [];
    private readonly ConcurrentDictionary<string, AtencionMonitorView> _monitorViews = [];
    private readonly ConcurrentDictionary<string, AtencionStateView> _stateViews = [];
    private readonly ConcurrentDictionary<string, NextTurnView> _nextTurnViews = [];
    private readonly ConcurrentDictionary<string, List<NextTurnView>> _consultingPatients = [];
    private readonly ConcurrentDictionary<string, List<NextTurnView>> _payingPatients = [];
    private readonly ConcurrentDictionary<string, List<RecentAttentionRecordView>> _recentAttentionByService = [];
    private readonly ConcurrentDictionary<string, bool> _processedIdempotencyKeys = [];
    private readonly ILogger<InMemoryAtencionProjectionContext> _logger;

    public InMemoryAtencionProjectionContext(
        ILogger<InMemoryAtencionProjectionContext> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<bool> AlreadyProcessedAsync(
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        var result = _processedIdempotencyKeys.ContainsKey(idempotencyKey);
        return Task.FromResult(result);
    }

    public Task MarkProcessedAsync(
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        _processedIdempotencyKeys.TryAdd(idempotencyKey, true);
        return Task.CompletedTask;
    }

    public Task<ProjectionCheckpoint?> GetCheckpointAsync(
        string projectionId,
        CancellationToken cancellationToken = default)
    {
        _checkpoints.TryGetValue(projectionId, out var cp);
        return Task.FromResult(cp);
    }

    public Task SaveCheckpointAsync(
        ProjectionCheckpoint checkpoint,
        CancellationToken cancellationToken = default)
    {
        _checkpoints[checkpoint.ProjectionId] = checkpoint;
        return Task.CompletedTask;
    }

    public Task ClearAsync(
        string projectionId,
        CancellationToken cancellationToken = default)
    {
        _checkpoints.TryRemove(projectionId, out _);
        _processedIdempotencyKeys.Clear();
        _monitorViews.Clear();
        _stateViews.Clear();
        _nextTurnViews.Clear();
        _consultingPatients.Clear();
        _payingPatients.Clear();
        _recentAttentionByService.Clear();
        return Task.CompletedTask;
    }

    public IAsyncDisposable BeginTransactionAsync() => new NoOpTransaction();

    public Task UpdateMonitorViewAsync(
        string serviceId,
        string priority,
        string operation,
        CancellationToken cancellationToken = default)
    {
        var normalizedPriority = NormalizePriority(priority);
        var view = _monitorViews.GetOrAdd(serviceId, s => CreateDefaultMonitorView(s));

        var updated = operation switch
        {
            "increment" => view with
            {
                TotalPatientsWaiting = view.TotalPatientsWaiting + 1,
                HighPriorityCount = normalizedPriority == "high" ? view.HighPriorityCount + 1 : view.HighPriorityCount,
                NormalPriorityCount = normalizedPriority == "normal" ? view.NormalPriorityCount + 1 : view.NormalPriorityCount,
                LowPriorityCount = normalizedPriority == "low" ? view.LowPriorityCount + 1 : view.LowPriorityCount,
                LastPatientCheckedInAt = DateTime.UtcNow,
                ProjectedAt = DateTimeOffset.UtcNow
            },
            "decrement" => view with
            {
                TotalPatientsWaiting = Math.Max(0, view.TotalPatientsWaiting - 1),
                HighPriorityCount = normalizedPriority == "high" ? Math.Max(0, view.HighPriorityCount - 1) : view.HighPriorityCount,
                NormalPriorityCount = normalizedPriority == "normal" ? Math.Max(0, view.NormalPriorityCount - 1) : view.NormalPriorityCount,
                LowPriorityCount = normalizedPriority == "low" ? Math.Max(0, view.LowPriorityCount - 1) : view.LowPriorityCount,
                ProjectedAt = DateTimeOffset.UtcNow
            },
            _ => view
        };

        _monitorViews[serviceId] = updated;
        return Task.CompletedTask;
    }

    public Task AddPatientToQueueAsync(
        string serviceId,
        PatientInQueueDto patient,
        CancellationToken cancellationToken = default)
    {
        var view = _stateViews.GetOrAdd(serviceId, s => CreateDefaultStateView(s));
        
        if (view.PatientsInQueue.Any(p => p.PatientId == patient.PatientId))
            return Task.CompletedTask;

        var updatedQueue = new List<PatientInQueueDto>(view.PatientsInQueue) { patient };
        // Basic sorting: Priority (high first), then time
        updatedQueue.Sort((a, b) => {
            var pOrder = new Dictionary<string, int> { ["high"] = 0, ["normal"] = 1, ["low"] = 2 };
            var cmp = pOrder.GetValueOrDefault(NormalizePriority(a.Priority), 3).CompareTo(pOrder.GetValueOrDefault(NormalizePriority(b.Priority), 3));
            return cmp != 0 ? cmp : a.CheckInTime.CompareTo(b.CheckInTime);
        });

        _stateViews[serviceId] = view with { 
            PatientsInQueue = updatedQueue, 
            CurrentCount = updatedQueue.Count,
            AvailableSpots = Math.Max(0, view.MaxCapacity - updatedQueue.Count),
            ProjectedAt = DateTimeOffset.UtcNow 
        };
        return Task.CompletedTask;
    }

    public Task RemovePatientFromQueueAsync(
        string serviceId,
        string patientId,
        CancellationToken cancellationToken = default)
    {
        if (!_stateViews.TryGetValue(serviceId, out var view)) return Task.CompletedTask;

        var updatedQueue = view.PatientsInQueue.Where(p => p.PatientId != patientId).ToList();
        _stateViews[serviceId] = view with { 
            PatientsInQueue = updatedQueue, 
            CurrentCount = updatedQueue.Count,
            AvailableSpots = Math.Max(0, view.MaxCapacity - updatedQueue.Count),
            ProjectedAt = DateTimeOffset.UtcNow 
        };
        return Task.CompletedTask;
    }

    public Task<AtencionMonitorView?> GetMonitorViewAsync(string serviceId, CancellationToken ct)
    {
        _monitorViews.TryGetValue(serviceId, out var v);
        return Task.FromResult(v);
    }

    public Task<AtencionStateView?> GetQueueStateViewAsync(string serviceId, CancellationToken ct)
    {
        _stateViews.TryGetValue(serviceId, out var v);
        return Task.FromResult(v);
    }

    public Task<NextTurnView?> GetNextTurnViewAsync(string serviceId, CancellationToken ct)
    {
        _nextTurnViews.TryGetValue(serviceId, out var v);
        return Task.FromResult<NextTurnView?>(v);
    }

    public Task SetNextTurnViewAsync(string serviceId, NextTurnView? view, CancellationToken ct)
    {
        if (view == null) _nextTurnViews.TryRemove(serviceId, out _);
        else _nextTurnViews[serviceId] = view;
        return Task.CompletedTask;
    }

    public Task AddPatientToConsultationAsync(string serviceId, NextTurnView patient, CancellationToken ct)
    {
        var list = _consultingPatients.GetOrAdd(serviceId, _ => []);
        lock(list) { if (!list.Any(p => p.PatientId == patient.PatientId)) list.Add(patient); }
        return Task.CompletedTask;
    }

    public Task RemovePatientFromConsultationAsync(string serviceId, string patientId, CancellationToken ct)
    {
        if (_consultingPatients.TryGetValue(serviceId, out var list))
            lock(list) { list.RemoveAll(p => p.PatientId == patientId); }
        return Task.CompletedTask;
    }

    public Task AddPatientToPaymentAsync(string serviceId, NextTurnView patient, CancellationToken ct)
    {
        var list = _payingPatients.GetOrAdd(serviceId, _ => []);
        lock(list) { if (!list.Any(p => p.PatientId == patient.PatientId)) list.Add(patient); }
        return Task.CompletedTask;
    }

    public Task RemovePatientFromPaymentAsync(string serviceId, string patientId, CancellationToken ct)
    {
        if (_payingPatients.TryGetValue(serviceId, out var list))
            lock(list) { list.RemoveAll(p => p.PatientId == patientId); }
        return Task.CompletedTask;
    }

    public Task<AtencionFullStateView?> GetFullStateViewAsync(string serviceId, CancellationToken ct)
    {
        if (!_monitorViews.ContainsKey(serviceId)) return Task.FromResult<AtencionFullStateView?>(null);

        _stateViews.TryGetValue(serviceId, out var state);
        _consultingPatients.TryGetValue(serviceId, out var consulting);
        _payingPatients.TryGetValue(serviceId, out var paying);

        return Task.FromResult<AtencionFullStateView?>(new AtencionFullStateView {
            ServiceId = serviceId,
            Waiting = state?.PatientsInQueue ?? [],
            InConsultation = consulting?.ToList() ?? [],
            WaitingPayment = paying?.ToList() ?? [],
            ProjectedAt = DateTimeOffset.UtcNow
        });
    }

    public Task AddRecentAttentionRecordAsync(string serviceId, RecentAttentionRecordView record, CancellationToken ct)
    {
        var history = _recentAttentionByService.GetOrAdd(serviceId, _ => []);
        lock (history) { history.Insert(0, record); if (history.Count > 100) history.RemoveRange(100, history.Count - 100); }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<RecentAttentionRecordView>> GetRecentAttentionHistoryAsync(string serviceId, int limit, CancellationToken ct)
    {
        if (!_recentAttentionByService.TryGetValue(serviceId, out var history)) return Task.FromResult<IReadOnlyList<RecentAttentionRecordView>>([]);
        lock (history) { return Task.FromResult<IReadOnlyList<RecentAttentionRecordView>>(history.Take(limit).ToList()); }
    }

    public Task ClearQueueProjectionAsync(string serviceId, CancellationToken ct)
    {
        _stateViews.TryRemove(serviceId, out _);
        _monitorViews.TryRemove(serviceId, out _);
        _nextTurnViews.TryRemove(serviceId, out _);
        _consultingPatients.TryRemove(serviceId, out _);
        _payingPatients.TryRemove(serviceId, out _);
        _recentAttentionByService.TryRemove(serviceId, out _);
        return Task.CompletedTask;
    }

    private static AtencionMonitorView CreateDefaultMonitorView(string serviceId) => new() {
        ServiceId = serviceId, TotalPatientsWaiting = 0, HighPriorityCount = 0, NormalPriorityCount = 0, LowPriorityCount = 0,
        AverageWaitTimeMinutes = 0, UtilizationPercentage = 0, LastPatientCheckedInAt = null, ProjectedAt = DateTimeOffset.UtcNow
    };

    private static AtencionStateView CreateDefaultStateView(string serviceId) => new() {
        ServiceId = serviceId, MaxCapacity = 50, CurrentCount = 0, IsAtCapacity = false, AvailableSpots = 50, PatientsInQueue = [], ProjectedAt = DateTimeOffset.UtcNow
    };

    private sealed class NoOpTransaction : IAsyncDisposable { public ValueTask DisposeAsync() => ValueTask.CompletedTask; }
    private static string NormalizePriority(string p) => p.Trim().ToLowerInvariant() switch { "urgent" or "high" => "high", "medium" or "normal" => "normal", "low" => "low", _ => p.Trim().ToLowerInvariant() };
}
