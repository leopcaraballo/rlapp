namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

public sealed record PatientCancelledByPayment : DomainEvent
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required DateTime CancelledAt { get; init; }
    public string? Reason { get; init; }

    public override string EventName => nameof(PatientCancelledByPayment);

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();

        if (string.IsNullOrWhiteSpace(ServiceId))
            throw new InvalidOperationException("ServiceId is required");

        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");
    }
}
