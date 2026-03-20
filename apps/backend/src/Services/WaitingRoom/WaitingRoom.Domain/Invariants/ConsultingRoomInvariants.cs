namespace WaitingRoom.Domain.Invariants;

using Exceptions;

/// <summary>
/// Business invariants for the ConsultingRoom aggregate.
/// </summary>
public static class ConsultingRoomInvariants
{
    public static void ValidateRoomName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("Room name is required");
    }

    public static void ValidateRoomNotOccupied(string? currentPatientId)
    {
        if (currentPatientId != null)
            throw new DomainException("Consulting room is currently occupied by another patient");
    }

    public static void ValidateRoomIsActive(bool isActive)
    {
        if (!isActive)
            throw new DomainException("Consulting room is not active");
    }
}
