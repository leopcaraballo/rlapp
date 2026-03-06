namespace WaitingRoom.Application.Ports;

/// <summary>
/// Port for idempotency record persistence.
///
/// Design:
/// - Records successfully processed requests
/// - Returns cached response for duplicate requests
/// - Ensures true idempotence across system restarts
/// - Transaction-safe
///
/// Implementation must guarantee:
/// - Atomicity: Record persisted BEFORE response returned
/// - Consistency: Duplicate key rejected by DB constraint
/// - Isolation: ACID isolation level
/// - Durability: Persisted to disk
/// </summary>
public interface IIdempotencyStore
{
    /// <summary>
    /// Checks if request with given idempotency key already processed.
    /// </summary>
    /// <param name="idempotencyKey">Client-provided unique request ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Cached response if found, null otherwise</returns>
    Task<IdempotencyRecord?> GetRecordAsync(
        string idempotencyKey,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a successfully processed request.
    /// Must be called AFTER business logic succeeds but BEFORE response sent.
    /// </summary>
    /// <param name="idempotencyKey">Client-provided unique request ID</param>
    /// <param name="requestHash">SHA256 hash of request body for validation</param>
    /// <param name="responsePayload">Response body to cache</param>
    /// <param name="statusCode">HTTP status code of response</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <exception cref="InvalidOperationException">If key already exists (duplicate)</exception>
    Task RecordAsync(
        string idempotencyKey,
        string requestHash,
        string responsePayload,
        int statusCode,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs schema initialization (creates table if not exists).
    /// Should be called during application startup.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task EnsureSchemaAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Idempotency record retrieved from persistence.
/// </summary>
public sealed record IdempotencyRecord
{
    public required string IdempotencyKey { get; init; }
    public required string RequestHash { get; init; }
    public required string ResponsePayload { get; init; }
    public required int StatusCode { get; init; }
    public required DateTime CreatedAt { get; init; }
}
