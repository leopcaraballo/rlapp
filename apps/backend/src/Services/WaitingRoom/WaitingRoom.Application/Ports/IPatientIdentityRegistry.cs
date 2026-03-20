namespace WaitingRoom.Application.Ports;

/// <summary>
/// Persists and validates clinical patient identity records.
/// Enforces uniqueness of patient identifiers scoped per calendar day.
/// </summary>
public interface IPatientIdentityRegistry
{
    Task EnsureRegisteredAsync(
        string patientId,
        string patientIdentity,
        string patientName,
        string actor,
        CancellationToken cancellationToken = default);

    Task<string?> GetPatientIdByIdentityAsync(string identity, CancellationToken ct = default);
}
