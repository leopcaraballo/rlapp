namespace WaitingRoom.Tests.Domain.ValueObjects;

using FluentAssertions;
using WaitingRoom.Domain.Exceptions;
using WaitingRoom.Domain.ValueObjects;
using Xunit;

/// <summary>
/// Unit tests for canonical PatientId normalization.
///
/// Tests verify that:
/// 1. Different case variations resolve to same canonical value
/// 2. Whitespace is trimmed
/// 3. Invalid characters are rejected
/// 4. Length constraints enforced
/// 5. Value object immutability
/// </summary>
public class PatientIdCanonicalNormalizationTests
{
    [Theory]
    [InlineData("pat-001", "PAT-001")]
    [InlineData("PAT-001", "PAT-001")]
    [InlineData("Pat-001", "PAT-001")]
    [InlineData("pAt-001", "PAT-001")]
    public void GivenRawPatientId_WhenCreated_ThenNormalizedToUppercase(string input, string expected)
    {
        // Act
        var patientId = PatientId.Create(input);

        // Assert
        patientId.Value.Should().Be(expected);
    }

    [Theory]
    [InlineData(" pat-001 ", "PAT-001")]
    [InlineData("  PAT-001  ", "PAT-001")]
    [InlineData("\tpat-001\n", "PAT-001")]
    public void GivenPatientIdWithWhitespace_WhenCreated_ThenTrimsAndNormalizes(string input, string expected)
    {
        // Act
        var patientId = PatientId.Create(input);

        // Assert
        patientId.Value.Should().Be(expected);
    }

    [Theory]
    [InlineData("123456789")]
    [InlineData("ABC.123")]
    [InlineData("PAT-001")]
    [InlineData("12345678901234567890")]  // Exactly 20 chars
    public void GivenValidPatientId_ThenCreatesSuccessfully(string input)
    {
        // Act
        var patientId = PatientId.Create(input);

        // Assert
        patientId.Should().NotBeNull();
        patientId.Value.Should().Be(input.ToUpperInvariant());
    }

    [Theory]
    [InlineData("pat@001")]      // @ invalid
    [InlineData("pat#001")]      // # invalid
    [InlineData("pat 001")]      // space invalid
    [InlineData("pat/001")]      // / invalid
    [InlineData("pat\\001")]     // \ invalid
    public void GivenPatientIdWithInvalidCharacters_ThenThrowsDomainException(string input)
    {
        // Act
        var action = () => PatientId.Create(input);

        // Assert
        action.Should().Throw<DomainException>()
            .WithMessage("*invalid characters*");
    }

    [Fact]
    public void GivenPatientIdExceedingMaxLength_ThenThrowsDomainException()
    {
        // Arrange
        var tooLong = new string('A', 21);  // Max is 20

        // Act
        var action = () => PatientId.Create(tooLong);

        // Assert
        action.Should().Throw<DomainException>()
            .WithMessage("*exceeds maximum length*");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\t\n")]
    public void GivenEmptyOrNullPatientId_ThenThrowsDomainException(string? input)
    {
        // Act
        var action = () => PatientId.Create(input!);

        // Assert
        action.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void GivenTwoPatientIds_WithDifferentCases_WhenCompared_ThenEqual()
    {
        // Arrange
        var id1 = PatientId.Create("pat-001");
        var id2 = PatientId.Create("PAT-001");
        var id3 = PatientId.Create(" Pat-001 ");

        // Act & Assert
        id1.Value.Should().Be(id2.Value);
        id2.Value.Should().Be(id3.Value);
        id1.Should().Be(id2);  // Record equality
        id2.Should().Be(id3);
    }

    [Fact]
    public void GivenPatientId_WhenCallingToString_ThenReturnsCanonicalValue()
    {
        // Arrange
        var patientId = PatientId.Create("pAt-001");

        // Act
        var result = patientId.ToString();

        // Assert
        result.Should().Be("PAT-001");
    }

    [Fact]
    public void GivenPatientId_ThenIsImmutable()
    {
        // Arrange
        var patientId = PatientId.Create("pat-001");

        // Act: Try to modify (should not be possible with record type)
        // Record types are immutable by design
        var modified = patientId with { };  // Creates copy

        // Assert
        patientId.Value.Should().Be("PAT-001");
        modified.Value.Should().Be("PAT-001");
        modified.Should().Be(patientId);  // Still equal
    }
}
