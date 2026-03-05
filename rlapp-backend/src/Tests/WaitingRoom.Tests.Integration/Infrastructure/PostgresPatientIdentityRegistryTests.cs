namespace WaitingRoom.Tests.Integration.Infrastructure;

using BuildingBlocks.Observability;
using FluentAssertions;
using Npgsql;
using WaitingRoom.Application.Exceptions;
using WaitingRoom.Infrastructure.Observability;
using WaitingRoom.Infrastructure.Persistence.EventStore;
using WaitingRoom.Infrastructure.Persistence.Outbox;
using WaitingRoom.Infrastructure.Serialization;
using Xunit;

public sealed class PostgresPatientIdentityRegistryTests : IAsyncLifetime
{
    private readonly string _connectionString;

    public PostgresPatientIdentityRegistryTests()
    {
        _connectionString =
            Environment.GetEnvironmentVariable("RLAPP_INTEGRATION_EVENTSTORE_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=rlapp_waitingroom_test;Username=rlapp;Password=rlapp_secure_password";
    }

    public async Task InitializeAsync()
    {
        var serializer = new EventSerializer(EventTypeRegistry.CreateDefault());
        var outboxStore = new PostgresOutboxStore(_connectionString);
        IEventLagTracker lagTracker = new PostgresEventLagTracker(_connectionString);
        var eventStore = new PostgresEventStore(_connectionString, serializer, outboxStore, lagTracker);

        await eventStore.EnsureSchemaAsync();

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "TRUNCATE TABLE waiting_room_patients;";
        await command.ExecuteNonQueryAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GivenSamePatientAndName_WhenRegisteringTwice_ThenIdentityIsIdempotent()
    {
        // Arrange
        var registry = new PostgresPatientIdentityRegistry(_connectionString);

        // Act
        await registry.EnsureRegisteredAsync("CC-1001", "Maria Gomez", "reception-1");
        await registry.EnsureRegisteredAsync("CC-1001", "Maria Gomez", "reception-1");

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT COUNT(*)
FROM waiting_room_patients
WHERE patient_id = 'CC-1001';";

        // Assert
        var count = (long)(await command.ExecuteScalarAsync() ?? 0L);
        count.Should().Be(1);
    }

    [Fact]
    public async Task GivenExistingPatientWithDifferentName_WhenRegistering_ThenThrowsIdentityConflict()
    {
        // Arrange
        var registry = new PostgresPatientIdentityRegistry(_connectionString);

        await registry.EnsureRegisteredAsync("CC-2002", "Laura Perez", "reception-1");

        // Act
        var exception = await Assert.ThrowsAsync<PatientIdentityConflictException>(() =>
            registry.EnsureRegisteredAsync("CC-2002", "Laura P.", "reception-2"));

        // Assert
        exception.PatientId.Should().Be("CC-2002");
        exception.ExistingName.Should().Be("Laura Perez");
        exception.IncomingName.Should().Be("Laura P.");
    }

    [Fact]
    public void GivenEmptyConnectionString_WhenCreatingRegistry_ThenThrowsArgumentException()
    {
        // Arrange
        const string emptyConnectionString = "";

        // Act
        Action act = () => _ = new PostgresPatientIdentityRegistry(emptyConnectionString);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*Connection string is required*");
    }
}
