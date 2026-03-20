namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Immutable value object representing patient's legal identity (cedula/ID).
/// This is the primary identity for traceability and medical records.
/// </summary>
public sealed record PatientIdentity
{
    public string Value { get; }

    public PatientIdentity(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Patient identity cannot be empty");

        // Canonical normalization: trim + uppercase
        var normalized = value.Trim().ToUpperInvariant();

        if (normalized.Length < 6 || normalized.Length > 20)
            throw new DomainException("Patient identity must be between 6 and 20 characters");

        Value = normalized;
    }

    public override string ToString() => Value;
}
