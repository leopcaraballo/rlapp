namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

public sealed record PatientCancelledByAbsence : DomainEvent
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required DateTime CancelledAt { get; init; }
    public required int TotalAbsences { get; init; }

    public override string EventName => nameof(PatientCancelledByAbsence);

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();

        if (string.IsNullOrWhiteSpace(ServiceId))
            throw new InvalidOperationException("ServiceId is required");

        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");

        if (TotalAbsences <= 0)
            throw new InvalidOperationException("TotalAbsences must be greater than 0");
    }
}
