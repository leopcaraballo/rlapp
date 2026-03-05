namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;
using System.Text.RegularExpressions;

/// <summary>
/// Value object representing a patient identifier (National ID / Cédula).
///
/// Enforces canonical normalization:
/// - Trim whitespace
/// - Convert to UPPERCASE (case-insensitive equality)
/// - Validate format (alphanumeric with hyphens/dots only)
/// - No null or empty
/// - Immutable (record type)
///
/// Clinical Requirement:
/// - Must guarantee unique patient identity across the system
/// - Case-insensitive: "pat-001", "PAT-001", "Pat-001" all refer to same patient
/// - Case normalization ensures DB uniqueness even if PostgreSQL is case-sensitive
///
/// Examples:
/// - "123456789" → "123456789" (valid)
/// - " pat-001 " → "PAT-001" (trimmed + uppercase)
/// - "PAT-001" → "PAT-001" (already canonical)
/// - "123@456" → throws DomainException (invalid character)
/// </summary>
public sealed record PatientId
{
    /// <summary>
    /// Maximum length of patient ID (national ID limit).
    /// </summary>
    private const int MaxLength = 20;

    /// <summary>
    /// Allowed character pattern: alphanumeric, hyphens, dots.
    /// National IDs can contain: digits, letters (a-z, A-Z), hyphens, dots.
    /// </summary>
    private static readonly Regex AllowedCharacterPattern = new(
        @"^[a-zA-Z0-9\.\-]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public string Value { get; }

    private PatientId(string value) => Value = value;

    /// <summary>
    /// Creates and validates a PatientId with canonical normalization.
    /// </summary>
    /// <param name="value">Raw patient ID from input</param>
    /// <returns>Canonically normalized PatientId</returns>
    /// <exception cref="DomainException">If value is null, empty, or violates constraints</exception>
    public static PatientId Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("PatientId cannot be empty");

        // Normalize: trim + uppercase
        var normalized = value.Trim().ToUpperInvariant();

        // Validate length
        if (normalized.Length > MaxLength)
            throw new DomainException(
                $"PatientId exceeds maximum length of {MaxLength} characters. Provided: {normalized.Length}");

        // Validate character set
        if (!AllowedCharacterPattern.IsMatch(normalized))
            throw new DomainException(
                "PatientId contains invalid characters. Allowed: alphanumeric, hyphens, dots.");

        return new(normalized);
    }

    public override string ToString() => Value;
}
