namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Value object representing a waiting queue identifier.
/// </summary>
public sealed record WaitingServiceId
{
    public string Value { get; }

    private WaitingServiceId(string value) => Value = value;

    public static WaitingServiceId Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("WaitingServiceId cannot be empty");

        return new(value.Trim());
    }

    public override string ToString() => Value;
}
