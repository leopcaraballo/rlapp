namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Patient arrived at cashier.
/// </summary>
public sealed record PatientArrivedAtCashier : DomainEvent
{
    public required string PatientId { get; init; }
    public required decimal PaymentAmount { get; init; }
    public required DateTime ArrivedAt { get; init; }

    public override string EventName => "PatientArrivedAtCashier";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
        if (PaymentAmount <= 0) throw new InvalidOperationException("PaymentAmount must be > 0");
    }
}
