namespace WaitingRoom.Infrastructure.Persistence.Repositories;

using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class PatientRepository : IPatientRepository
{
    private readonly IEventStore _eventStore;
    private readonly IPatientIdentityRegistry _identityRegistry;

    public PatientRepository(IEventStore eventStore, IPatientIdentityRegistry identityRegistry)
    {
        _eventStore = eventStore ?? throw new ArgumentNullException(nameof(eventStore));
        _identityRegistry = identityRegistry ?? throw new ArgumentNullException(nameof(identityRegistry));
    }

    public Task<Patient?> GetByIdAsync(string patientId, CancellationToken ct = default)
        => _eventStore.LoadAsync<Patient>(patientId, ct);

    public async Task<Patient?> GetByIdentityAsync(string identity, CancellationToken ct = default)
    {
        var patientId = await _identityRegistry.GetPatientIdByIdentityAsync(identity, ct);
        if (string.IsNullOrWhiteSpace(patientId)) return null;
        return await GetByIdAsync(patientId, ct);
    }

    public Task SaveAsync(Patient patient, CancellationToken ct = default)
        => _eventStore.SaveAsync(patient, ct);
}
