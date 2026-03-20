namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Application.Ports;
using WaitingRoom.Projections.Abstractions;

/// <summary>
/// Projection handler for Consulting Room related events.
/// Updates the consulting_room_occupancy_view read model in PostgreSQL.
/// </summary>
public sealed class ConsultingRoomOccupancyProjectionHandler : IProjectionHandler
{
    private readonly IConsultingRoomOccupancyRepository _roomRepository;
    private readonly IPatientStateRepository _patientRepository;

    public string EventName => "ConsultingRoomHandler";

    public ConsultingRoomOccupancyProjectionHandler(
        IConsultingRoomOccupancyRepository roomRepository,
        IPatientStateRepository patientRepository)
    {
        _roomRepository = roomRepository ?? throw new ArgumentNullException(nameof(roomRepository));
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
    }

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        var idempotencyKey = $"room-occupancy:{@event.Metadata.AggregateId}:{@event.Metadata.Version}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var roomId = @event.Metadata.AggregateId;
        var currentRow = await _roomRepository.GetByIdAsync(roomId, cancellationToken);

        var updatedRow = @event switch
        {
            ConsultingRoomCreated e => Handle(e),
            ConsultingRoomActivated e => Handle(e, currentRow),
            ConsultingRoomDeactivated e => Handle(e, currentRow),
            ConsultingRoomPatientAssigned e => await Handle(e, currentRow, cancellationToken),
            ConsultingRoomPatientLeft e => Handle(e, currentRow),
            _ => currentRow
        };

        if (updatedRow != null && updatedRow != currentRow)
        {
            await _roomRepository.UpsertAsync(updatedRow, cancellationToken);
        }

        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }

    private ConsultingRoomOccupancyRow Handle(ConsultingRoomCreated e) => new()
    {
        RoomId = e.RoomId,
        RoomName = e.RoomName,
        IsActive = e.IsActive,
        UpdatedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private ConsultingRoomOccupancyRow? Handle(ConsultingRoomActivated e, ConsultingRoomOccupancyRow? current)
        => current == null ? null : current with
    {
        IsActive = true,
        UpdatedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private ConsultingRoomOccupancyRow? Handle(ConsultingRoomDeactivated e, ConsultingRoomOccupancyRow? current)
        => current == null ? null : current with
    {
        IsActive = false,
        UpdatedAt = e.Metadata.OccurredAt,
        UpdatedByEventVersion = e.Metadata.Version
    };

    private async Task<ConsultingRoomOccupancyRow?> Handle(
        ConsultingRoomPatientAssigned e, 
        ConsultingRoomOccupancyRow? current,
        CancellationToken ct)
    {
        if (current == null) return null;

        var patient = await _patientRepository.GetByIdAsync(e.PatientId, ct);

        return current with
        {
            CurrentPatientId = e.PatientId,
            PatientName = patient?.PatientName,
            AttentionStartedAt = e.AssignedAt,
            UpdatedAt = e.Metadata.OccurredAt,
            UpdatedByEventVersion = e.Metadata.Version
        };
    }

    private ConsultingRoomOccupancyRow? Handle(ConsultingRoomPatientLeft e, ConsultingRoomOccupancyRow? current)
    {
        if (current == null) return null;

        int? duration = null;
        if (current.AttentionStartedAt.HasValue)
        {
            duration = (int)(e.LeftAt - current.AttentionStartedAt.Value).TotalSeconds;
        }

        return current with
        {
            CurrentPatientId = null,
            PatientName = null,
            AttentionStartedAt = null,
            AttentionDurationSeconds = duration,
            UpdatedAt = e.Metadata.OccurredAt,
            UpdatedByEventVersion = e.Metadata.Version
        };
    }
}
