namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Receptionist marks patient as "En Espera".
/// </summary>
public sealed record PatientMarkedAsWaiting : DomainEvent
{
    public required string PatientId { get; init; }
    public required DateTime WaitingStartedAt { get; init; }

    public override string EventName => "PatientMarkedAsWaiting";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
