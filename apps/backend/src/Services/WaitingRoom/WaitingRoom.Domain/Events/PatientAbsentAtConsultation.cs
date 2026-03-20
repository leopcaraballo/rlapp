namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

public sealed record PatientAbsentAtConsultation : DomainEvent
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required DateTime AbsentAt { get; init; }
    public required int RetryNumber { get; init; }

    public override string EventName => nameof(PatientAbsentAtConsultation);

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();

        if (string.IsNullOrWhiteSpace(ServiceId))
            throw new InvalidOperationException("ServiceId is required");

        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");

        if (RetryNumber <= 0)
            throw new InvalidOperationException("RetryNumber must be greater than 0");
    }
}
