namespace WaitingRoom.Application.Ports;

/// <summary>
/// Persists and validates clinical patient identity records.
/// Enforces global uniqueness of patient identifiers.
/// </summary>
public interface IPatientIdentityRegistry
{
    Task EnsureRegisteredAsync(
        string patientId,
        string patientName,
        string actor,
        CancellationToken cancellationToken = default);
}
