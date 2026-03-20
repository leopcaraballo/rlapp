namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class AssignConsultingRoomCommandHandler : IRequestHandler<AssignConsultingRoomCommand, AssignConsultingRoomResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IConsultingRoomRepository _roomRepository;

    public AssignConsultingRoomCommandHandler(
        IPatientRepository patientRepository,
        IConsultingRoomRepository roomRepository)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
        _roomRepository = roomRepository ?? throw new ArgumentNullException(nameof(roomRepository));
    }

    public async Task<AssignConsultingRoomResponse> Handle(AssignConsultingRoomCommand command, CancellationToken cancellationToken)
    {
        // 1. Load both aggregates
        var room = await _roomRepository.GetByIdAsync(command.ConsultingRoomId, cancellationToken);
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);

        if (room == null || patient == null)
        {
            return new AssignConsultingRoomResponse { Success = false };
        }

        // 2. Build metadata
        var correlationId = command.CorrelationId ?? Guid.NewGuid().ToString();
        var patientMetadata = EventMetadata.CreateNew(command.PatientId, command.Actor, correlationId);
        var roomMetadata = EventMetadata.CreateNew(command.ConsultingRoomId, command.Actor, correlationId);

        // 3. Execute domain logic
        patient.AssignConsultingRoom(command.ConsultingRoomId, room.IsActive, patientMetadata);
        room.AssignPatient(command.PatientId, roomMetadata);

        // 4. Save both (Note: In a robust system, this should be transactional or use a Saga)
        await _patientRepository.SaveAsync(patient, cancellationToken);
        await _roomRepository.SaveAsync(room, cancellationToken);

        return new AssignConsultingRoomResponse { Success = true };
    }
}
