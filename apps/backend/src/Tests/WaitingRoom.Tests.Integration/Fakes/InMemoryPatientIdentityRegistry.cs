namespace WaitingRoom.Tests.Integration.Fakes;

using System.Collections.Concurrent;
using WaitingRoom.Application.Ports;

/// <summary>
/// In-memory implementation of IPatientIdentityRegistry for integration tests.
/// Accepts all patient registrations without requiring PostgreSQL.
/// </summary>
internal sealed class InMemoryPatientIdentityRegistry : IPatientIdentityRegistry
{
    private readonly ConcurrentDictionary<string, string> _patients =
        new(StringComparer.Ordinal);

    public Task EnsureRegisteredAsync(
        string patientId,
        string patientName,
        string actor,
        CancellationToken cancellationToken = default)
    {
        _patients.TryAdd(patientId, patientName);
        return Task.CompletedTask;
    }
}
