namespace WaitingRoom.Infrastructure.Persistence.Repositories;

using Dapper;
using Npgsql;
using WaitingRoom.Application.Ports;

public sealed class PostgresConsultingRoomOccupancyRepository : IConsultingRoomOccupancyRepository
{
    private readonly string _connectionString;

    public PostgresConsultingRoomOccupancyRepository(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }

    public async Task UpsertAsync(ConsultingRoomOccupancyRow row, CancellationToken ct = default)
    {
        const string sql = @"
INSERT INTO consulting_room_occupancy_view (
    room_id, room_name, is_active, 
    current_patient_id, patient_name, 
    attention_started_at, attention_duration_seconds, 
    updated_at, updated_by_event_version
)
VALUES (
    @RoomId, @RoomName, @IsActive, 
    @CurrentPatientId, @PatientName, 
    @AttentionStartedAt, @AttentionDurationSeconds, 
    @UpdatedAt, @UpdatedByEventVersion
)
ON CONFLICT (room_id) DO UPDATE SET
    room_name = EXCLUDED.room_name,
    is_active = EXCLUDED.is_active,
    current_patient_id = EXCLUDED.current_patient_id,
    patient_name = EXCLUDED.patient_name,
    attention_started_at = EXCLUDED.attention_started_at,
    attention_duration_seconds = EXCLUDED.attention_duration_seconds,
    updated_at = EXCLUDED.updated_at,
    updated_by_event_version = EXCLUDED.updated_by_event_version
WHERE EXCLUDED.updated_by_event_version > consulting_room_occupancy_view.updated_by_event_version;";

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(new CommandDefinition(sql, row, cancellationToken: ct));
    }

    public async Task<ConsultingRoomOccupancyRow?> GetByIdAsync(string roomId, CancellationToken ct = default)
    {
        const string sql = "SELECT * FROM consulting_room_occupancy_view WHERE room_id = @RoomId;";
        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<ConsultingRoomOccupancyRow>(
            new CommandDefinition(sql, new { RoomId = roomId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<ConsultingRoomOccupancyRow>> GetAllAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT * FROM consulting_room_occupancy_view ORDER BY room_name ASC;";
        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QueryAsync<ConsultingRoomOccupancyRow>(new CommandDefinition(sql, cancellationToken: ct));
    }
}
