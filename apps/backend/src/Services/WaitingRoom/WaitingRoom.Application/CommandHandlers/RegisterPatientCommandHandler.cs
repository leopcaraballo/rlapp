namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.ValueObjects;

public sealed class RegisterPatientCommandHandler : IRequestHandler<RegisterPatientCommand, RegisterPatientResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IPatientIdentityRegistry _identityRegistry;

    public RegisterPatientCommandHandler(
        IPatientRepository patientRepository,
        IPatientIdentityRegistry identityRegistry)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
        _identityRegistry = identityRegistry ?? throw new ArgumentNullException(nameof(identityRegistry));
    }

    public async Task<RegisterPatientResponse> Handle(RegisterPatientCommand command, CancellationToken cancellationToken)
    {
        // 1. Check if patient already registered by identity
        var existingPatient = await _patientRepository.GetByIdentityAsync(command.PatientIdentity, cancellationToken);
        if (existingPatient != null)
        {
            return new RegisterPatientResponse
            {
                PatientId = existingPatient.Id,
                Message = "Patient already registered"
            };
        }

        // 2. Create new patient
        var patientId = Guid.NewGuid().ToString("D");
        var identity = new PatientIdentity(command.PatientIdentity);
        var metadata = EventMetadata.CreateNew(
            aggregateId: patientId,
            actor: "System", // Default actor for registration if not provided
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        var patient = Patient.Create(
            patientId: patientId,
            identity: identity,
            patientName: command.PatientName,
            phoneNumber: command.PhoneNumber,
            metadata: metadata);

        // 3. Ensure identity uniqueness in registry (side effect/safety)
        await _identityRegistry.EnsureRegisteredAsync(
            patientId: patientId,
            patientIdentity: command.PatientIdentity,
            patientName: command.PatientName,
            actor: "System",
            cancellationToken: cancellationToken);

        // 4. Save aggregate
        await _patientRepository.SaveAsync(patient, cancellationToken);

        return new RegisterPatientResponse
        {
            PatientId = patientId,
            Message = "Patient registered successfully"
        };
    }
}
