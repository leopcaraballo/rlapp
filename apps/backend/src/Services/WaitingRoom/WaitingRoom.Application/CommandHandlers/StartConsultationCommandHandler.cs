namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class StartConsultationCommandHandler : IRequestHandler<StartConsultationCommand, StartConsultationResponse>
{
    private readonly IPatientRepository _patientRepository;

    public StartConsultationCommandHandler(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
    }

    public async Task<StartConsultationResponse> Handle(StartConsultationCommand command, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);
        if (patient == null)
        {
            return new StartConsultationResponse { Success = false };
        }

        var metadata = EventMetadata.CreateNew(
            aggregateId: command.PatientId,
            actor: command.Actor,
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        patient.StartConsultation(metadata);

        await _patientRepository.SaveAsync(patient, cancellationToken);

        return new StartConsultationResponse { Success = true };
    }
}
