namespace WaitingRoom.Tests.Integration.Fakes;

using System.Collections.Concurrent;
using WaitingRoom.Application.Ports;

/// <summary>
/// In-memory implementation of IIdempotencyStore for integration tests.
/// Provides true idempotency behavior without requiring PostgreSQL.
/// </summary>
internal sealed class InMemoryIdempotencyStore : IIdempotencyStore
{
    private readonly ConcurrentDictionary<string, IdempotencyRecord> _records = new(StringComparer.Ordinal);

    public Task<IdempotencyRecord?> GetRecordAsync(
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        _records.TryGetValue(idempotencyKey, out var record);
        return Task.FromResult(record);
    }

    public Task RecordAsync(
        string idempotencyKey,
        string requestHash,
        string responsePayload,
        int statusCode,
        CancellationToken cancellationToken = default)
    {
        var record = new IdempotencyRecord
        {
            IdempotencyKey = idempotencyKey,
            RequestHash = requestHash,
            ResponsePayload = responsePayload,
            StatusCode = statusCode,
            CreatedAt = DateTime.UtcNow
        };

        _records.TryAdd(idempotencyKey, record);
        return Task.CompletedTask;
    }

    public Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
