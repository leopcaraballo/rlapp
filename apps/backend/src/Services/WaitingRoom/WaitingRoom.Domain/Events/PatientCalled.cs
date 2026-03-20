namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event emitted when a claimed patient is called to consultation.
/// </summary>
public sealed record PatientCalled : DomainEvent
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required DateTime CalledAt { get; init; }

    public override string EventName => nameof(PatientCalled);

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();

        if (string.IsNullOrWhiteSpace(ServiceId))
            throw new InvalidOperationException("ServiceId is required");

        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}
