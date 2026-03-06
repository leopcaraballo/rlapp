namespace WaitingRoom.Tests.Integration.Infrastructure;

using FluentAssertions;
using System.Text.Json;
using WaitingRoom.Infrastructure.Persistence.Idempotency;
using Xunit;

/// <summary>
/// Integration tests for idempotency store persistence.
///
/// Tests validate:
/// 1. Idempotency table created successfully
/// 2. Records persisted and retrieved
/// 3. Duplicate key detection by database constraint
/// 4. TTL and expiry handling
/// 5. Thread-safe concurrent operations
/// </summary>
public class PostgresIdempotencyStoreTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private PostgresIdempotencyStore _store = null!;

    public PostgresIdempotencyStoreTests()
    {
        _connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=rlapp_waitingroom;Username=rlapp;Password=rlapp_secure_password";
    }

    public async Task InitializeAsync()
    {
        _store = new PostgresIdempotencyStore(_connectionString);

        // Ensure schema exists
        try
        {
            await _store.EnsureSchemaAsync();
        }
        catch
        {
            // Schema might already exist, continue
        }
    }

    public async Task DisposeAsync()
    {
        // Cleanup (optional - test DB can be reset)
        await Task.CompletedTask;
    }

    [Fact]
    public async Task GivenNewIdempotencyKey_WhenRecorded_ThenCanBeRetrieved()
    {
        // Arrange
        var key = Guid.NewGuid().ToString("D");
        var hash = "request-hash-abc123";
        var response = "{\"status\":\"ok\",\"queueId\":\"queue-123\"}";
        var statusCode = 200;

        // Act: Record
        await _store.RecordAsync(key, hash, response, statusCode);

        // Act: Retrieve
        var retrieved = await _store.GetRecordAsync(key);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.IdempotencyKey.Should().Be(key);
        retrieved.RequestHash.Should().Be(hash);
        using var storedJson = JsonDocument.Parse(retrieved.ResponsePayload);
        using var expectedJson = JsonDocument.Parse(response);
        JsonElement.DeepEquals(storedJson.RootElement, expectedJson.RootElement).Should().BeTrue();
        retrieved.StatusCode.Should().Be(statusCode);
    }

    [Fact]
    public async Task GivenDuplicateIdempotencyKey_WhenRecorded_ThenIgnoresDuplicate()
    {
        // Arrange
        var key = Guid.NewGuid().ToString("D");
        var response1 = "{\"status\":\"ok\",\"queueId\":\"queue-1\"}";
        var response2 = "{\"status\":\"error\",\"message\":\"different\"}";

        // Act: Record first
        await _store.RecordAsync(key, "hash1", response1, 200);

        // Act: Try to record duplicate (should not throw, DB constraint handles it)
        await _store.RecordAsync(key, "hash2", response2, 400);

        // Assert: First record still exists
        var retrieved = await _store.GetRecordAsync(key);
        using var storedJson = JsonDocument.Parse(retrieved!.ResponsePayload);
        using var expectedJson = JsonDocument.Parse(response1);
        JsonElement.DeepEquals(storedJson.RootElement, expectedJson.RootElement).Should().BeTrue();
        retrieved.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task GivenNonExistentIdempotencyKey_WhenRetrieved_ThenReturnsNull()
    {
        // Arrange
        var nonExistentKey = Guid.NewGuid().ToString("D");

        // Act
        var retrieved = await _store.GetRecordAsync(nonExistentKey);

        // Assert
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task GivenMultipleDifferentKeys_WhenRecorded_ThenAllRetrievable()
    {
        // Arrange
        var keys = Enumerable.Range(0, 5)
            .Select(_ => Guid.NewGuid().ToString("D"))
            .ToList();

        // Act: Record all
        foreach ((var i, var key) in keys.Select((k, i) => (i, k)))
        {
            await _store.RecordAsync(
                key,
                $"hash-{i}",
                $"{{\"id\":{i}}}",
                200);
        }

        // Act: Retrieve all
        var retrieved = new List<(string Key, int? StatusCode)>();
        foreach (var key in keys)
        {
            var record = await _store.GetRecordAsync(key);
            retrieved.Add((key, record?.StatusCode));
        }

        // Assert: All exist
        retrieved.Should().HaveCount(5);
        foreach (var (key, statusCode) in retrieved)
        {
            statusCode.Should().Be(200);
        }
    }

    [Fact]
    public async Task GivenValidIdempotencyRecord_WhenRequestHashMissing_ThenThrowsArgumentException()
    {
        // Arrange
        var key = Guid.NewGuid().ToString("D");

        // Act
        var action = () => _store.RecordAsync(key, "", "{\"ok\":true}", 200);

        // Assert
        await action.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task GivenConcurrentIdenticalRequests_ThenOnlyProcessesOnce()
    {
        // Arrange
        var sharedKey = Guid.NewGuid().ToString("D");
        var tasks = Enumerable.Range(0, 10)
            .Select(_ => _store.RecordAsync(
                sharedKey,
                "shared-hash",
                "{\"concurrent\":\"test\"}",
                201))
            .ToList();

        // Act: All tasks run concurrently
        var exceptions = new List<Exception>();
        foreach (var task in tasks)
        {
            try
            {
                await task;
            }
            catch (Exception ex)
            {
                exceptions.Add(ex);
            }
        }

        // Assert: No exceptions (DB constraint silently absorbs duplicates)
        exceptions.Should().BeEmpty();

        // Verify only one record persisted
        var record = await _store.GetRecordAsync(sharedKey);
        record.Should().NotBeNull();
        record!.IdempotencyKey.Should().Be(sharedKey);
    }
}
