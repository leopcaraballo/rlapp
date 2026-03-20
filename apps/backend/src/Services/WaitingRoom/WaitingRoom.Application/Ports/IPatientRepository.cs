namespace WaitingRoom.Application.Ports;

using WaitingRoom.Domain.Aggregates;

/// <summary>
/// Repository for Patient aggregate.
/// </summary>
public interface IPatientRepository
{
    Task<Patient?> GetByIdAsync(string patientId, CancellationToken ct = default);
    Task<Patient?> GetByIdentityAsync(string identity, CancellationToken ct = default);
    Task SaveAsync(Patient patient, CancellationToken ct = default);
}
