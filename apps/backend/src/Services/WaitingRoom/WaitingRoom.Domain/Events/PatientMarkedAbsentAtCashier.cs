namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Patient marked as absent at cashier.
/// </summary>
public sealed record PatientMarkedAbsentAtCashier : DomainEvent
{
    public required string PatientId { get; init; }
    public required DateTime MarkedAbsentAt { get; init; }
    public string? Reason { get; init; }

    public override string EventName => "PatientMarkedAbsentAtCashier";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
