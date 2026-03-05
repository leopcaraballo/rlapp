namespace WaitingRoom.Tests.Integration.Fakes;

using System.Collections.Concurrent;
using System.Data;
using WaitingRoom.Application.Ports;

/// <summary>
/// In-memory implementation of IOutboxStore for integration tests.
/// Accepts all outbox operations without requiring PostgreSQL or RabbitMQ.
/// </summary>
internal sealed class InMemoryOutboxStore : IOutboxStore
{
    private readonly ConcurrentBag<OutboxMessage> _messages = [];

    public Task AddAsync(
        List<OutboxMessage> messages,
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken = default)
    {
        foreach (var message in messages)
            _messages.Add(message);

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<OutboxMessage>> GetPendingAsync(
        int batchSize,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<OutboxMessage> result = _messages
            .Where(m => m.Status == OutboxStatus.Pending)
            .Take(batchSize)
            .ToList();

        return Task.FromResult(result);
    }

    public Task MarkDispatchedAsync(
        IEnumerable<Guid> eventIds,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task MarkFailedAsync(
        IEnumerable<Guid> eventIds,
        string error,
        TimeSpan retryAfter,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
