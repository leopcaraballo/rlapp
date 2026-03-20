namespace WaitingRoom.Tests.Integration.Fakes;

using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using WaitingRoom.Application.Ports;

/// <summary>
/// In-memory implementation of IPatientIdentityRegistry for integration tests.
/// Accepts all patient registrations without requiring PostgreSQL.
/// </summary>
internal sealed class InMemoryPatientIdentityRegistry : IPatientIdentityRegistry
{
    private readonly ConcurrentDictionary<string, string> _patients =
        new(StringComparer.Ordinal);
    
    // Map Identity -> PatientId
    private readonly ConcurrentDictionary<string, string> _identityToId =
        new(StringComparer.Ordinal);

    public Task EnsureRegisteredAsync(
        string patientId,
        string patientIdentity,
        string patientName,
        string actor,
        CancellationToken cancellationToken = default)
    {
        _patients.TryAdd(patientId, patientName);
        _identityToId.TryAdd(patientIdentity, patientId);
        return Task.CompletedTask;
    }

    public Task<string?> GetPatientIdByIdentityAsync(
        string identity,
        CancellationToken cancellationToken = default)
    {
        _identityToId.TryGetValue(identity, out var patientId);
        return Task.FromResult(patientId);
    }
}
