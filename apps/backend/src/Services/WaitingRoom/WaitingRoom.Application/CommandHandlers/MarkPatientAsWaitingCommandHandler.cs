namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class MarkPatientAsWaitingCommandHandler : IRequestHandler<MarkPatientAsWaitingCommand, MarkPatientAsWaitingResponse>
{
    private readonly IPatientRepository _patientRepository;

    public MarkPatientAsWaitingCommandHandler(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
    }

    public async Task<MarkPatientAsWaitingResponse> Handle(MarkPatientAsWaitingCommand command, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);
        if (patient == null)
        {
            return new MarkPatientAsWaitingResponse { Success = false };
        }

        var metadata = EventMetadata.CreateNew(
            aggregateId: command.PatientId,
            actor: command.Actor,
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        patient.MarkAsWaiting(metadata);

        await _patientRepository.SaveAsync(patient, cancellationToken);

        return new MarkPatientAsWaitingResponse { Success = true };
    }
}
