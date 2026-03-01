namespace WaitingRoom.Infrastructure.Persistence;

using System.Data;
using Dapper;
using EventStore;
using Idempotency;
using Microsoft.Extensions.Logging;
using Npgsql;

/// <summary>
/// Database initialization coordinator.
/// Ensures all required schemas are created during application startup.
///
/// Clinical Context:
/// - Must be executed once during deployment
/// - Idempotent: Can be called multiple times safely
/// - Atomic: Each schema creation is independent
/// - Fail-fast: Stops if any schema creation fails
/// </summary>
public sealed class DatabaseInitializer
{
    private readonly string _connectionString;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(
        string connectionString,
        ILogger<DatabaseInitializer> logger)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Initializes all required database schemas.
    /// Call once during application startup (e.g., in Program.cs Web)
    ///
    /// Order matters:
    /// 1. Event Store tables (fundamental)
    /// 2. Patient Identity table (clinical requirement)
    /// 3. Idempotency records table (operational requirement)
    /// </summary>
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            _logger.LogInformation("Initializing database schemas...");

            // 1. EventStore schema (events, outbox, patients)
            _logger.LogInformation("Creating event store schema...");
            await connection.ExecuteAsync(new CommandDefinition(
                EventStoreSchema.CreateEventsTableSql,
                cancellationToken: cancellationToken));

            await connection.ExecuteAsync(new CommandDefinition(
                EventStoreSchema.CreateOutboxTableSql,
                cancellationToken: cancellationToken));

            await connection.ExecuteAsync(new CommandDefinition(
                EventStoreSchema.CreatePatientsTableSql,
                cancellationToken: cancellationToken));

            _logger.LogInformation("Event store schema initialized successfully.");

            // 2. Idempotency schema (operational requirement)
            _logger.LogInformation("Creating idempotency schema...");
            await connection.ExecuteAsync(new CommandDefinition(
                IdempotencySchema.CreateIdempotencyTableSql,
                cancellationToken: cancellationToken));

            _logger.LogInformation("Idempotency schema initialized successfully.");

            _logger.LogInformation("All database schemas initialized successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to initialize database schemas. Application cannot start.");
            throw;
        }
    }
}
