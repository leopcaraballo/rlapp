namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Patient registered via public form.
/// </summary>
public sealed record PatientRegistered : DomainEvent
{
    public required string PatientId { get; init; }
    public required string PatientIdentity { get; init; } // Cédula
    public required string PatientName { get; init; }
    public string? PhoneNumber { get; init; }
    public required DateTime RegisteredAt { get; init; }

    public override string EventName => "PatientRegistered";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
        if (string.IsNullOrWhiteSpace(PatientIdentity)) throw new InvalidOperationException("PatientIdentity is required");
        if (string.IsNullOrWhiteSpace(PatientName)) throw new InvalidOperationException("PatientName is required");
    }
}
