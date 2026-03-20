namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Cashier validated payment.
/// </summary>
public sealed record PatientPaymentValidated : DomainEvent
{
    public required string PatientId { get; init; }
    public required DateTime ValidatedAt { get; init; }

    // Legacy properties for WaitingQueue compatibility
    public string? ServiceId { get; init; }
    public string? PatientName { get; init; }
    public string? Priority { get; init; }
    public string? ConsultationType { get; init; }
    public string? PaymentReference { get; init; }
    public int? TurnNumber { get; init; }

    public override string EventName => "PatientPaymentValidated";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
    }
}
