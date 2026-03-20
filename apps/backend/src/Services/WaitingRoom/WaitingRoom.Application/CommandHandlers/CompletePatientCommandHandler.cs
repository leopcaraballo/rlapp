namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class CompletePatientCommandHandler : IRequestHandler<CompletePatientCommand, CompletePatientResponse>
{
    private readonly IPatientRepository _patientRepository;

    public CompletePatientCommandHandler(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
    }

    public async Task<CompletePatientResponse> Handle(CompletePatientCommand command, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);
        if (patient == null)
        {
            return new CompletePatientResponse { Success = false };
        }

        var metadata = EventMetadata.CreateNew(
            aggregateId: command.PatientId,
            actor: "Receptionist",
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        patient.Complete(metadata);

        await _patientRepository.SaveAsync(patient, cancellationToken);

        return new CompletePatientResponse { Success = true };
    }
}
