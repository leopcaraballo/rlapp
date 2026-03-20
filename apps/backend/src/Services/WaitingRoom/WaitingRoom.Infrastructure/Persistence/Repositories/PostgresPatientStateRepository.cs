namespace WaitingRoom.Infrastructure.Persistence.Repositories;

using Dapper;
using Npgsql;
using WaitingRoom.Application.Ports;

public sealed class PostgresPatientStateRepository : IPatientStateRepository
{
    private readonly string _connectionString;

    public PostgresPatientStateRepository(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }

    public async Task UpsertAsync(PatientStateRow row, CancellationToken ct = default)
    {
        const string sql = @"
INSERT INTO patients_state_view (
    patient_id, patient_identity, patient_name, current_state, 
    waiting_started_at, assigned_room_id, consultation_started_at, 
    consultation_finished_at, payment_amount, payment_attempts, 
    payment_validated_at, completed_at, leave_reason, 
    created_at, last_modified_at, updated_by_event_version
)
VALUES (
    @PatientId, @PatientIdentity, @PatientName, @CurrentState, 
    @WaitingStartedAt, @AssignedRoomId, @ConsultationStartedAt, 
    @ConsultationFinishedAt, @PaymentAmount, @PaymentAttempts, 
    @PaymentValidatedAt, @CompletedAt, @LeaveReason, 
    @CreatedAt, @LastModifiedAt, @UpdatedByEventVersion
)
ON CONFLICT (patient_id) DO UPDATE SET
    current_state = EXCLUDED.current_state,
    waiting_started_at = EXCLUDED.waiting_started_at,
    assigned_room_id = EXCLUDED.assigned_room_id,
    consultation_started_at = EXCLUDED.consultation_started_at,
    consultation_finished_at = EXCLUDED.consultation_finished_at,
    payment_amount = EXCLUDED.payment_amount,
    payment_attempts = EXCLUDED.payment_attempts,
    payment_validated_at = EXCLUDED.payment_validated_at,
    completed_at = EXCLUDED.completed_at,
    leave_reason = EXCLUDED.leave_reason,
    last_modified_at = EXCLUDED.last_modified_at,
    updated_by_event_version = EXCLUDED.updated_by_event_version
WHERE EXCLUDED.updated_by_event_version > patients_state_view.updated_by_event_version;";

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(new CommandDefinition(sql, row, cancellationToken: ct));
    }

    public async Task<PatientStateRow?> GetByIdAsync(string patientId, CancellationToken ct = default)
    {
        const string sql = "SELECT * FROM patients_state_view WHERE patient_id = @PatientId;";
        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<PatientStateRow>(
            new CommandDefinition(sql, new { PatientId = patientId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<PatientStateRow>> GetAllWaitingAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT * FROM patients_state_view WHERE current_state = 'Waiting' ORDER BY waiting_started_at ASC;";
        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QueryAsync<PatientStateRow>(new CommandDefinition(sql, cancellationToken: ct));
    }
}
