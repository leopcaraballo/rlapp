namespace WaitingRoom.Infrastructure.Persistence.EventStore;

using Dapper;
using Npgsql;
using WaitingRoom.Application.Exceptions;
using WaitingRoom.Application.Ports;

public sealed class PostgresPatientIdentityRegistry : IPatientIdentityRegistry
{
    private readonly string _connectionString;

    public PostgresPatientIdentityRegistry(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new ArgumentException("Connection string is required", nameof(connectionString));

        _connectionString = connectionString;
    }

    public async Task EnsureRegisteredAsync(
        string patientId,
        string patientIdentity,
        string patientName,
        string actor,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            throw new ArgumentException("PatientId is required", nameof(patientId));
        if (string.IsNullOrWhiteSpace(patientIdentity))
            throw new ArgumentException("PatientIdentity is required", nameof(patientIdentity));

        var canonicalPatientId = patientId.Trim().ToUpperInvariant();

        const string insertSql = @"
INSERT INTO waiting_room_patients (patient_id, patient_identity, patient_name, registration_date, created_at, created_by)
VALUES (@PatientId, @PatientIdentity, @PatientName, CURRENT_DATE, @CreatedAt, @CreatedBy)
ON CONFLICT (patient_id) DO NOTHING;";

        const string selectSql = @"
SELECT patient_name
FROM waiting_room_patients
WHERE patient_id = @PatientId
LIMIT 1;";

        await using var connection = new NpgsqlConnection(_connectionString);
        var insertCommand = new CommandDefinition(
            insertSql,
            new
            {
                PatientId = canonicalPatientId,
                PatientIdentity = patientIdentity.Trim(),
                PatientName = patientName,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = actor
            },
            cancellationToken: cancellationToken);

        await connection.ExecuteAsync(insertCommand);

        var persistedName = await connection.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
            selectSql,
            new { PatientId = canonicalPatientId },
            cancellationToken: cancellationToken));

        if (string.IsNullOrWhiteSpace(persistedName))
            throw new ApplicationException($"Unable to confirm patient identity registration for '{canonicalPatientId}'.");

        if (!string.Equals(persistedName.Trim(), patientName.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new PatientIdentityConflictException(canonicalPatientId, persistedName, patientName);
        }
    }

    public async Task<string?> GetPatientIdByIdentityAsync(string identity, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(identity)) return null;

        const string sql = @"
SELECT patient_id 
FROM waiting_room_patients 
WHERE patient_identity = @Identity 
  AND registration_date = CURRENT_DATE
LIMIT 1;";

        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
            sql,
            new { Identity = identity },
            cancellationToken: ct));
    }
}
