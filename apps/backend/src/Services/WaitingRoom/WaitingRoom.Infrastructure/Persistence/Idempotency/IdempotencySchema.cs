namespace WaitingRoom.Infrastructure.Persistence.Idempotency;

/// <summary>
/// Database schema definition for idempotency records.
/// Isolated in separate file for clarity and maintainability.
/// </summary>
internal static class IdempotencySchema
{
    public const string IdempotencyTable = "waiting_room_idempotency_records";

    /// <summary>
    /// Creates persistent idempotency table to enforce true request deduplication.
    ///
    /// Design:
    /// - idempotency_key: Client-provided unique request ID
    /// - request_hash: SHA256 of request body for validation
    /// - response_payload: Cached successful response
    /// - status_code: HTTP status of original response
    /// - created_at: Request timestamp
    /// - expires_at: TTL for garbage collection (24h default)
    ///
    /// Guarantees:
    /// - Identical request within 24h returns exact same response
    /// - Prevents duplicate processing
    /// - Survives application restart
    /// - Thread-safe: UNIQUE constraint enforced by DB
    /// </summary>
    public const string CreateIdempotencyTableSql = @"
CREATE TABLE IF NOT EXISTS waiting_room_idempotency_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_payload TEXT NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_idempotency_key
    ON waiting_room_idempotency_records (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_waiting_room_idempotency_expires
    ON waiting_room_idempotency_records (expires_at);
";

    /// <summary>
    /// Cleanup old idempotency records (older than 24h).
    /// Should be run periodically by maintenance job or worker.
    /// </summary>
    public const string CleanupExpiredIdempotencyRecordsSql = @"
DELETE FROM waiting_room_idempotency_records
WHERE expires_at < NOW();
";
}
