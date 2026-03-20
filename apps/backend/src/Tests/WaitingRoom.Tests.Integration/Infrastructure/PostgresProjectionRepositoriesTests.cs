namespace WaitingRoom.Tests.Integration.Infrastructure;

using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using WaitingRoom.Application.Ports;
using WaitingRoom.Infrastructure.Persistence;
using WaitingRoom.Infrastructure.Persistence.Repositories;
using Xunit;

[Trait("Category", "Infrastructure")]
public sealed class PostgresProjectionRepositoriesTests : IAsyncLifetime
{
    private readonly string _connectionString;

    public PostgresProjectionRepositoriesTests()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;

        _connectionString =
            Environment.GetEnvironmentVariable("RLAPP_INTEGRATION_EVENTSTORE_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=rlapp_waitingroom_test;Username=rlapp;Password=rlapp_secure_password";
    }

    public async Task InitializeAsync()
    {
        await EnsureLegacyEventStoreCompatibilityAsync();

        var initializer = new DatabaseInitializer(_connectionString, NullLogger<DatabaseInitializer>.Instance);
        await initializer.InitializeAsync();

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
TRUNCATE TABLE
    patients_state_view,
    cashier_queue_view,
    consulting_room_occupancy_view;";

        await command.ExecuteNonQueryAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task EnsureLegacyEventStoreCompatibilityAsync()
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
    ALTER TABLE IF EXISTS waiting_room_events
    ADD COLUMN IF NOT EXISTS aggregate_type TEXT NOT NULL DEFAULT 'Patient';

    ALTER TABLE IF EXISTS waiting_room_patients
    ADD COLUMN IF NOT EXISTS registration_date DATE NOT NULL DEFAULT CURRENT_DATE;";

        await command.ExecuteNonQueryAsync();
    }

    [Fact]
    public async Task GivenPatientStateRow_WhenUpserted_ThenCanBeRetrievedById()
    {
        // Arrange
        var repository = new PostgresPatientStateRepository(_connectionString);
        var row = CreatePatientStateRow(
            patientId: "PAT-001",
            patientIdentity: "DOC-001",
            patientName: "Ana Torres",
            currentState: "Waiting",
            waitingStartedAt: Utc(8, 15),
            assignedRoomId: "ROOM-001",
            consultationStartedAt: Utc(8, 25),
            consultationFinishedAt: Utc(8, 45),
            paymentAmount: 180m,
            paymentAttempts: 2,
            paymentValidatedAt: Utc(8, 50),
            completedAt: Utc(8, 55),
            leaveReason: null,
            createdAt: Utc(8, 10),
            lastModifiedAt: Utc(8, 55),
            updatedByEventVersion: 7);

        // Act
        await repository.UpsertAsync(row);
        var retrieved = await repository.GetByIdAsync("PAT-001");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.PatientId.Should().Be("PAT-001");
        retrieved.PatientIdentity.Should().Be("DOC-001");
        retrieved.PatientName.Should().Be("Ana Torres");
        retrieved.CurrentState.Should().Be("Waiting");
        retrieved.WaitingStartedAt.Should().Be(Utc(8, 15));
        retrieved.AssignedRoomId.Should().Be("ROOM-001");
        retrieved.ConsultationStartedAt.Should().Be(Utc(8, 25));
        retrieved.ConsultationFinishedAt.Should().Be(Utc(8, 45));
        retrieved.PaymentAmount.Should().Be(180m);
        retrieved.PaymentAttempts.Should().Be(2);
        retrieved.PaymentValidatedAt.Should().Be(Utc(8, 50));
        retrieved.CompletedAt.Should().Be(Utc(8, 55));
        retrieved.LeaveReason.Should().BeNull();
        retrieved.CreatedAt.Should().Be(Utc(8, 10));
        retrieved.LastModifiedAt.Should().Be(Utc(8, 55));
        retrieved.UpdatedByEventVersion.Should().Be(7);
    }

    [Fact]
    public async Task GivenOlderPatientStateVersion_WhenUpsertedAfterNewer_ThenNewerDataRemains()
    {
        // Arrange
        var repository = new PostgresPatientStateRepository(_connectionString);

        var newer = CreatePatientStateRow(
            patientId: "PAT-002",
            patientIdentity: "DOC-002",
            patientName: "Carlos Vega",
            currentState: "InConsultation",
            waitingStartedAt: Utc(9, 0),
            assignedRoomId: "ROOM-002",
            consultationStartedAt: Utc(9, 15),
            consultationFinishedAt: null,
            paymentAmount: null,
            paymentAttempts: 0,
            paymentValidatedAt: null,
            completedAt: null,
            leaveReason: null,
            createdAt: Utc(8, 50),
            lastModifiedAt: Utc(9, 20),
            updatedByEventVersion: 10);

        var older = CreatePatientStateRow(
            patientId: "PAT-002",
            patientIdentity: "DOC-002",
            patientName: "Carlos Vega",
            currentState: "Waiting",
            waitingStartedAt: Utc(9, 5),
            assignedRoomId: null,
            consultationStartedAt: null,
            consultationFinishedAt: null,
            paymentAmount: null,
            paymentAttempts: 0,
            paymentValidatedAt: null,
            completedAt: null,
            leaveReason: null,
            createdAt: Utc(8, 50),
            lastModifiedAt: Utc(9, 10),
            updatedByEventVersion: 9);

        // Act
        await repository.UpsertAsync(newer);
        await repository.UpsertAsync(older);
        var retrieved = await repository.GetByIdAsync("PAT-002");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.CurrentState.Should().Be("InConsultation");
        retrieved.AssignedRoomId.Should().Be("ROOM-002");
        retrieved.ConsultationStartedAt.Should().Be(Utc(9, 15));
        retrieved.LastModifiedAt.Should().Be(Utc(9, 20));
        retrieved.UpdatedByEventVersion.Should().Be(10);
    }

    [Fact]
    public async Task GivenMultiplePatientStates_WhenGetAllWaiting_ThenReturnsOnlyWaitingOrderedByWaitingStartedAt()
    {
        // Arrange
        var repository = new PostgresPatientStateRepository(_connectionString);

        var waitingLater = CreatePatientStateRow(
            patientId: "PAT-003",
            patientIdentity: "DOC-003",
            patientName: "Marta Ruiz",
            currentState: "Waiting",
            waitingStartedAt: Utc(10, 20),
            assignedRoomId: null,
            consultationStartedAt: null,
            consultationFinishedAt: null,
            paymentAmount: null,
            paymentAttempts: 0,
            paymentValidatedAt: null,
            completedAt: null,
            leaveReason: null,
            createdAt: Utc(10, 0),
            lastModifiedAt: Utc(10, 20),
            updatedByEventVersion: 3);

        var notWaiting = CreatePatientStateRow(
            patientId: "PAT-004",
            patientIdentity: "DOC-004",
            patientName: "Pablo Diaz",
            currentState: "InConsultation",
            waitingStartedAt: Utc(10, 5),
            assignedRoomId: "ROOM-003",
            consultationStartedAt: Utc(10, 30),
            consultationFinishedAt: null,
            paymentAmount: null,
            paymentAttempts: 0,
            paymentValidatedAt: null,
            completedAt: null,
            leaveReason: null,
            createdAt: Utc(10, 0),
            lastModifiedAt: Utc(10, 30),
            updatedByEventVersion: 5);

        var waitingEarlier = CreatePatientStateRow(
            patientId: "PAT-005",
            patientIdentity: "DOC-005",
            patientName: "Sofia Leon",
            currentState: "Waiting",
            waitingStartedAt: Utc(10, 10),
            assignedRoomId: null,
            consultationStartedAt: null,
            consultationFinishedAt: null,
            paymentAmount: null,
            paymentAttempts: 0,
            paymentValidatedAt: null,
            completedAt: null,
            leaveReason: null,
            createdAt: Utc(10, 0),
            lastModifiedAt: Utc(10, 10),
            updatedByEventVersion: 4);

        // Act
        await repository.UpsertAsync(waitingLater);
        await repository.UpsertAsync(notWaiting);
        await repository.UpsertAsync(waitingEarlier);

        var waitingRows = (await repository.GetAllWaitingAsync()).ToList();

        // Assert
        waitingRows.Should().HaveCount(2);
        waitingRows.Select(x => x.PatientId).Should().ContainInOrder("PAT-005", "PAT-003");
        waitingRows.Should().OnlyContain(x => x.CurrentState == "Waiting");
        waitingRows.Select(x => x.WaitingStartedAt)
            .Should().ContainInOrder(Utc(10, 10), Utc(10, 20));
    }

    [Fact]
    public async Task GivenCashierQueueRows_WhenInserted_ThenGetAllReturnsOrderedByArrival()
    {
        // Arrange
        var repository = new PostgresCashierQueueRepository(_connectionString);

        var secondArrival = CreateCashierQueueRow(
            patientId: "PAT-101",
            patientIdentity: "DOC-101",
            patientName: "Lucia Marquez",
            paymentAmount: 240m,
            arrivedAtCashierAt: Utc(11, 10),
            paymentAttempts: 1,
            updatedAt: Utc(11, 10),
            updatedByEventVersion: 2);

        var firstArrival = CreateCashierQueueRow(
            patientId: "PAT-102",
            patientIdentity: "DOC-102",
            patientName: "Diego Soto",
            paymentAmount: 120m,
            arrivedAtCashierAt: Utc(11, 5),
            paymentAttempts: 1,
            updatedAt: Utc(11, 5),
            updatedByEventVersion: 2);

        var thirdArrival = CreateCashierQueueRow(
            patientId: "PAT-103",
            patientIdentity: "DOC-103",
            patientName: "Nora Salas",
            paymentAmount: 310m,
            arrivedAtCashierAt: Utc(11, 20),
            paymentAttempts: 3,
            updatedAt: Utc(11, 20),
            updatedByEventVersion: 4);

        // Act
        await repository.UpsertAsync(secondArrival);
        await repository.UpsertAsync(firstArrival);
        await repository.UpsertAsync(thirdArrival);

        var rows = (await repository.GetAllAsync()).ToList();

        // Assert
        rows.Should().HaveCount(3);
        rows.Select(x => x.PatientId).Should().ContainInOrder("PAT-102", "PAT-101", "PAT-103");
        rows.Select(x => x.ArrivedAtCashierAt)
            .Should().ContainInOrder(Utc(11, 5), Utc(11, 10), Utc(11, 20));
    }

    [Fact]
    public async Task GivenCashierQueueRow_WhenDeleted_ThenGetByIdReturnsNull()
    {
        // Arrange
        var repository = new PostgresCashierQueueRepository(_connectionString);

        var row = CreateCashierQueueRow(
            patientId: "PAT-104",
            patientIdentity: "DOC-104",
            patientName: "Hector Mora",
            paymentAmount: 180m,
            arrivedAtCashierAt: Utc(12, 0),
            paymentAttempts: 1,
            updatedAt: Utc(12, 0),
            updatedByEventVersion: 1);

        await repository.UpsertAsync(row);

        // Act
        await repository.DeleteAsync("PAT-104");
        var deleted = await repository.GetByIdAsync("PAT-104");

        // Assert
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task GivenConsultingRoomOccupancyRow_WhenUpserted_ThenCanBeRetrievedById()
    {
        // Arrange
        var repository = new PostgresConsultingRoomOccupancyRepository(_connectionString);

        var row = CreateConsultingRoomOccupancyRow(
            roomId: "ROOM-201",
            roomName: "Consultorio Norte",
            isActive: true,
            currentPatientId: "PAT-201",
            patientName: "Elena Pardo",
            attentionStartedAt: Utc(13, 5),
            attentionDurationSeconds: 900,
            updatedAt: Utc(13, 20),
            updatedByEventVersion: 6);

        // Act
        await repository.UpsertAsync(row);
        var retrieved = await repository.GetByIdAsync("ROOM-201");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.RoomId.Should().Be("ROOM-201");
        retrieved.RoomName.Should().Be("Consultorio Norte");
        retrieved.IsActive.Should().BeTrue();
        retrieved.CurrentPatientId.Should().Be("PAT-201");
        retrieved.PatientName.Should().Be("Elena Pardo");
        retrieved.AttentionStartedAt.Should().Be(Utc(13, 5));
        retrieved.AttentionDurationSeconds.Should().Be(900);
        retrieved.UpdatedAt.Should().Be(Utc(13, 20));
        retrieved.UpdatedByEventVersion.Should().Be(6);
    }

    [Fact]
    public async Task GivenOlderConsultingRoomVersion_WhenUpsertedAfterNewer_ThenNewerDataRemains()
    {
        // Arrange
        var repository = new PostgresConsultingRoomOccupancyRepository(_connectionString);

        var newer = CreateConsultingRoomOccupancyRow(
            roomId: "ROOM-202",
            roomName: "Consultorio Sur",
            isActive: true,
            currentPatientId: "PAT-202",
            patientName: "Raul Pineda",
            attentionStartedAt: Utc(14, 0),
            attentionDurationSeconds: 600,
            updatedAt: Utc(14, 10),
            updatedByEventVersion: 12);

        var older = CreateConsultingRoomOccupancyRow(
            roomId: "ROOM-202",
            roomName: "Consultorio Sur",
            isActive: false,
            currentPatientId: null,
            patientName: null,
            attentionStartedAt: null,
            attentionDurationSeconds: null,
            updatedAt: Utc(14, 5),
            updatedByEventVersion: 11);

        // Act
        await repository.UpsertAsync(newer);
        await repository.UpsertAsync(older);
        var retrieved = await repository.GetByIdAsync("ROOM-202");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.IsActive.Should().BeTrue();
        retrieved.CurrentPatientId.Should().Be("PAT-202");
        retrieved.PatientName.Should().Be("Raul Pineda");
        retrieved.AttentionStartedAt.Should().Be(Utc(14, 0));
        retrieved.AttentionDurationSeconds.Should().Be(600);
        retrieved.UpdatedAt.Should().Be(Utc(14, 10));
        retrieved.UpdatedByEventVersion.Should().Be(12);
    }

    private static PatientStateRow CreatePatientStateRow(
        string patientId,
        string patientIdentity,
        string patientName,
        string currentState,
        DateTime? waitingStartedAt,
        string? assignedRoomId,
        DateTime? consultationStartedAt,
        DateTime? consultationFinishedAt,
        decimal? paymentAmount,
        int paymentAttempts,
        DateTime? paymentValidatedAt,
        DateTime? completedAt,
        string? leaveReason,
        DateTime createdAt,
        DateTime lastModifiedAt,
        long updatedByEventVersion)
    {
        return new PatientStateRow
        {
            PatientId = patientId,
            PatientIdentity = patientIdentity,
            PatientName = patientName,
            CurrentState = currentState,
            WaitingStartedAt = waitingStartedAt,
            AssignedRoomId = assignedRoomId,
            ConsultationStartedAt = consultationStartedAt,
            ConsultationFinishedAt = consultationFinishedAt,
            PaymentAmount = paymentAmount,
            PaymentAttempts = paymentAttempts,
            PaymentValidatedAt = paymentValidatedAt,
            CompletedAt = completedAt,
            LeaveReason = leaveReason,
            CreatedAt = createdAt,
            LastModifiedAt = lastModifiedAt,
            UpdatedByEventVersion = updatedByEventVersion,
        };
    }

    private static CashierQueueRow CreateCashierQueueRow(
        string patientId,
        string patientIdentity,
        string patientName,
        decimal paymentAmount,
        DateTime arrivedAtCashierAt,
        int paymentAttempts,
        DateTime updatedAt,
        long updatedByEventVersion)
    {
        return new CashierQueueRow
        {
            PatientId = patientId,
            PatientIdentity = patientIdentity,
            PatientName = patientName,
            PaymentAmount = paymentAmount,
            ArrivedAtCashierAt = arrivedAtCashierAt,
            PaymentAttempts = paymentAttempts,
            UpdatedAt = updatedAt,
            UpdatedByEventVersion = updatedByEventVersion,
        };
    }

    private static ConsultingRoomOccupancyRow CreateConsultingRoomOccupancyRow(
        string roomId,
        string roomName,
        bool isActive,
        string? currentPatientId,
        string? patientName,
        DateTime? attentionStartedAt,
        int? attentionDurationSeconds,
        DateTime updatedAt,
        long updatedByEventVersion)
    {
        return new ConsultingRoomOccupancyRow
        {
            RoomId = roomId,
            RoomName = roomName,
            IsActive = isActive,
            CurrentPatientId = currentPatientId,
            PatientName = patientName,
            AttentionStartedAt = attentionStartedAt,
            AttentionDurationSeconds = attentionDurationSeconds,
            UpdatedAt = updatedAt,
            UpdatedByEventVersion = updatedByEventVersion,
        };
    }

    private static DateTime Utc(int hour, int minute) => new(2026, 3, 19, hour, minute, 0, DateTimeKind.Utc);
}
