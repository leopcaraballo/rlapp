namespace WaitingRoom.Domain.Aggregates;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Domain.Invariants;
using WaitingRoom.Domain.Exceptions;

/// <summary>
/// Aggregate Root: ConsultingRoom
/// Represents a single consulting room in the medical facility.
/// </summary>
public sealed class ConsultingRoom : AggregateRoot
{
    public string RoomName { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public string? CurrentPatientId { get; private set; }
    public DateTime? AttentionStartedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime LastModifiedAt { get; private set; }

    private ConsultingRoom() { }

    /// <summary>
    /// Factory: Creates a new ConsultingRoom (default: ACTIVE).
    /// </summary>
    public static ConsultingRoom Create(
        string roomId,
        string roomName,
        EventMetadata metadata)
    {
        ConsultingRoomInvariants.ValidateRoomName(roomName);

        var room = new ConsultingRoom();

        var @event = new ConsultingRoomCreated
        {
            Metadata = metadata.WithVersion(room.Version + 1),
            RoomId = roomId,
            RoomName = roomName,
            IsActive = true,
            CreatedAt = metadata.OccurredAt
        };

        room.RaiseEvent(@event);
        return room;
    }

    public void Activate(string adminId, EventMetadata metadata)
    {
        if (IsActive) return;

        var @event = new ConsultingRoomActivated
        {
            Metadata = metadata.WithVersion(Version + 1),
            RoomId = Id,
            ActivatedAt = metadata.OccurredAt,
            ActivatedBy = adminId
        };

        RaiseEvent(@event);
    }

    public void Deactivate(string adminId, EventMetadata metadata)
    {
        if (!IsActive) return;

        ConsultingRoomInvariants.ValidateRoomNotOccupied(CurrentPatientId);

        var @event = new ConsultingRoomDeactivated
        {
            Metadata = metadata.WithVersion(Version + 1),
            RoomId = Id,
            DeactivatedAt = metadata.OccurredAt,
            DeactivatedBy = adminId
        };

        RaiseEvent(@event);
    }

    public void AssignPatient(string patientId, EventMetadata metadata)
    {
        ConsultingRoomInvariants.ValidateRoomIsActive(IsActive);
        ConsultingRoomInvariants.ValidateRoomNotOccupied(CurrentPatientId);

        var @event = new ConsultingRoomPatientAssigned
        {
            Metadata = metadata.WithVersion(Version + 1),
            RoomId = Id,
            PatientId = patientId,
            AssignedAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    public void ReleasePatient(string patientId, EventMetadata metadata)
    {
        if (CurrentPatientId != patientId)
            throw new DomainException($"Patient {patientId} is not being attended in room {Id}");

        var @event = new ConsultingRoomPatientLeft
        {
            Metadata = metadata.WithVersion(Version + 1),
            RoomId = Id,
            PatientId = patientId,
            LeftAt = metadata.OccurredAt
        };

        RaiseEvent(@event);
    }

    // ===== EVENT HANDLERS =====

    private void When(ConsultingRoomCreated @event)
    {
        Id = @event.RoomId;
        RoomName = @event.RoomName;
        IsActive = @event.IsActive;
        CreatedAt = @event.CreatedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(ConsultingRoomActivated @event)
    {
        IsActive = true;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(ConsultingRoomDeactivated @event)
    {
        IsActive = false;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(ConsultingRoomPatientAssigned @event)
    {
        CurrentPatientId = @event.PatientId;
        AttentionStartedAt = @event.AssignedAt;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }

    private void When(ConsultingRoomPatientLeft @event)
    {
        CurrentPatientId = null;
        AttentionStartedAt = null;
        LastModifiedAt = @event.Metadata.OccurredAt;
    }
}
