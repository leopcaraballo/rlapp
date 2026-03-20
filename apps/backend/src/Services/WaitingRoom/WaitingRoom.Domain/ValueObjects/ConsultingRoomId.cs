namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Value object for consulting room identifiers.
/// Format: ROOM-XXX
/// </summary>
public sealed record ConsultingRoomId
{
    public string Value { get; }

    public ConsultingRoomId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Consulting room ID cannot be empty");

        var normalized = value.Trim().ToUpperInvariant();

        if (!normalized.StartsWith("ROOM-"))
            throw new DomainException("Consulting room ID must start with 'ROOM-'");

        Value = normalized;
    }

    public override string ToString() => Value;
}
