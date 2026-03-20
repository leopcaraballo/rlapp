namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class FinishConsultationCommandHandler : IRequestHandler<FinishConsultationCommand, FinishConsultationResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IConsultingRoomRepository _roomRepository;

    public FinishConsultationCommandHandler(
        IPatientRepository patientRepository,
        IConsultingRoomRepository roomRepository)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
        _roomRepository = roomRepository ?? throw new ArgumentNullException(nameof(roomRepository));
    }

    public async Task<FinishConsultationResponse> Handle(FinishConsultationCommand command, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);
        if (patient == null || string.IsNullOrEmpty(patient.AssignedConsultingRoomId))
        {
            return new FinishConsultationResponse { Success = false };
        }

        var roomId = patient.AssignedConsultingRoomId;
        var room = await _roomRepository.GetByIdAsync(roomId, cancellationToken);
        if (room == null)
        {
            return new FinishConsultationResponse { Success = false };
        }

        var correlationId = command.CorrelationId ?? Guid.NewGuid().ToString();
        var patientMetadata = EventMetadata.CreateNew(command.PatientId, command.Actor, correlationId);
        var roomMetadata = EventMetadata.CreateNew(roomId, command.Actor, correlationId);

        // Terminar en el paciente
        patient.FinishConsultation(command.Notes, patientMetadata);
        
        // Liberar el consultorio
        room.ReleasePatient(command.PatientId, roomMetadata);

        await _patientRepository.SaveAsync(patient, cancellationToken);
        await _roomRepository.SaveAsync(room, cancellationToken);

        return new FinishConsultationResponse { Success = true };
    }
}
