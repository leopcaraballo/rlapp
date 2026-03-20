namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Process completed.
/// </summary>
public sealed record PatientCompleted : DomainEvent
{
    public required string PatientId { get; init; }
    public required DateTime CompletedAt { get; init; }

    public override string EventName => "PatientCompleted";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
