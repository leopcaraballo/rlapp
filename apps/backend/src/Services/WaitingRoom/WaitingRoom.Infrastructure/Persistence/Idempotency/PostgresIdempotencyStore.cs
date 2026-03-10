namespace WaitingRoom.Infrastructure.Persistence.Idempotency;

using Dapper;
using Npgsql;
using WaitingRoom.Application.Ports;

internal sealed class PostgresIdempotencyStore : IIdempotencyStore
{
    private readonly string _connectionString;

    public PostgresIdempotencyStore(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new ArgumentException("Connection string required", nameof(connectionString));

        _connectionString = connectionString;
    }

    public async Task<IdempotencyRecord?> GetRecordAsync(
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("Idempotency key required", nameof(idempotencyKey));

        const string sql = @"
SELECT idempotency_key AS IdempotencyKey,
       request_hash AS RequestHash,
       response_payload AS ResponsePayload,
       status_code AS StatusCode,
       created_at AS CreatedAt
FROM waiting_room_idempotency_records
WHERE idempotency_key = @IdempotencyKey
  AND expires_at > NOW()
LIMIT 1;";

        await using var connection = new NpgsqlConnection(_connectionString);
        var command = new CommandDefinition(
            sql,
            new { IdempotencyKey = idempotencyKey },
            cancellationToken: cancellationToken);

        var record = await connection.QuerySingleOrDefaultAsync<IdempotencyRecord>(command);
        return record;
    }

    public async Task RecordAsync(
        string idempotencyKey,
        string requestHash,
        string responsePayload,
        int statusCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("Idempotency key required", nameof(idempotencyKey));

        if (string.IsNullOrWhiteSpace(requestHash))
            throw new ArgumentException("Request hash required", nameof(requestHash));

        if (string.IsNullOrWhiteSpace(responsePayload))
            throw new ArgumentException("Response payload required", nameof(responsePayload));

        const string sql = @"
INSERT INTO waiting_room_idempotency_records (
    idempotency_key,
    request_hash,
    response_payload,
    status_code,
    created_at,
    expires_at
)
VALUES (
    @IdempotencyKey,
    @RequestHash,
    @ResponsePayload,
    @StatusCode,
    NOW(),
    NOW() + INTERVAL '24 hours'
);";

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        try
        {
            var command = new CommandDefinition(
                sql,
                new
                {
                    IdempotencyKey = idempotencyKey,
                    RequestHash = requestHash,
                    ResponsePayload = responsePayload,
                    StatusCode = statusCode
                },
                cancellationToken: cancellationToken);

            await connection.ExecuteAsync(command);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")  // Unique constraint violation
        {
            // Key already exists - this is expected for retries
            // Just return gracefully
        }
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        var command = new CommandDefinition(
            IdempotencySchema.CreateIdempotencyTableSql,
            cancellationToken: cancellationToken);

        await connection.ExecuteAsync(command);
    }
}
