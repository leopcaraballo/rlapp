namespace WaitingRoom.Tests.Integration.Fakes;

using BuildingBlocks.Observability;

/// <summary>
/// No-op implementation of IEventLagTracker for integration tests.
/// Discards all lag metrics — not needed for functional testing.
/// </summary>
internal sealed class NoOpEventLagTracker : IEventLagTracker
{
    public Task RecordEventCreatedAsync(
        string eventId,
        string eventName,
        string aggregateId,
        DateTime createdAt,
        CancellationToken cancellation = default)
        => Task.CompletedTask;

    public Task RecordEventPublishedAsync(
        string eventId,
        DateTime publishedAt,
        int dispatchDurationMs,
        CancellationToken cancellation = default)
        => Task.CompletedTask;

    public Task RecordEventProcessedAsync(
        string eventId,
        DateTime processedAt,
        int processingDurationMs,
        CancellationToken cancellation = default)
        => Task.CompletedTask;

    public Task RecordEventFailedAsync(
        string eventId,
        string reason,
        CancellationToken cancellation = default)
        => Task.CompletedTask;

    public Task<EventLagMetrics?> GetLagMetricsAsync(
        string eventId,
        CancellationToken cancellation = default)
        => Task.FromResult<EventLagMetrics?>(null);

    public Task<EventLagStatistics?> GetStatisticsAsync(
        string eventName,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellation = default)
        => Task.FromResult<EventLagStatistics?>(null);

    public Task<IEnumerable<EventLagMetrics>> GetSlowestEventsAsync(
        string? eventName = null,
        int limit = 10,
        CancellationToken cancellation = default)
        => Task.FromResult<IEnumerable<EventLagMetrics>>([]);
}
