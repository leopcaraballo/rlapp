namespace WaitingRoom.Infrastructure.Persistence.Repositories;

using Dapper;
using Npgsql;
using WaitingRoom.Application.Ports;

public sealed class PostgresCashierQueueRepository : ICashierQueueRepository
{
    private readonly string _connectionString;

    public PostgresCashierQueueRepository(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }

    public async Task UpsertAsync(CashierQueueRow row, CancellationToken ct = default)
    {
        const string sql = @"
INSERT INTO cashier_queue_view (
    patient_id, patient_identity, patient_name, 
    payment_amount, arrived_at_cashier_at, payment_attempts, 
    updated_at, updated_by_event_version
)
VALUES (
    @PatientId, @PatientIdentity, @PatientName, 
    @PaymentAmount, @ArrivedAtCashierAt, @PaymentAttempts, 
    @UpdatedAt, @UpdatedByEventVersion
)
ON CONFLICT (patient_id) DO UPDATE SET
    payment_amount = EXCLUDED.payment_amount,
    payment_attempts = EXCLUDED.payment_attempts,
    updated_at = EXCLUDED.updated_at,
    updated_by_event_version = EXCLUDED.updated_by_event_version
WHERE EXCLUDED.updated_by_event_version > cashier_queue_view.updated_by_event_version;";

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(new CommandDefinition(sql, row, cancellationToken: ct));
    }

    public async Task DeleteAsync(string patientId, CancellationToken ct = default)
    {
        const string sql = "DELETE FROM cashier_queue_view WHERE patient_id = @PatientId;";
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(new CommandDefinition(sql, new { PatientId = patientId }, cancellationToken: ct));
    }

    public async Task<CashierQueueRow?> GetByIdAsync(string patientId, CancellationToken ct = default)
    {
        const string sql = "SELECT * FROM cashier_queue_view WHERE patient_id = @PatientId;";
        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<CashierQueueRow>(
            new CommandDefinition(sql, new { PatientId = patientId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<CashierQueueRow>> GetAllAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT * FROM cashier_queue_view ORDER BY arrived_at_cashier_at ASC;";
        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QueryAsync<CashierQueueRow>(new CommandDefinition(sql, cancellationToken: ct));
    }
}
