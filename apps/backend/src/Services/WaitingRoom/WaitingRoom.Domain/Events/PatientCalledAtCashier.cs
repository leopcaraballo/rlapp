namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

public sealed record PatientCalledAtCashier : DomainEvent
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string Priority { get; init; }
    public required string ConsultationType { get; init; }
    public required DateTime CalledAt { get; init; }
    public string? CashierDeskId { get; init; }
    public int TurnNumber { get; init; }

    public override string EventName => nameof(PatientCalledAtCashier);

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();

        if (string.IsNullOrWhiteSpace(ServiceId))
            throw new InvalidOperationException("ServiceId is required");

        if (string.IsNullOrWhiteSpace(PatientId))
            throw new InvalidOperationException("PatientId is required");

        if (string.IsNullOrWhiteSpace(PatientName))
            throw new InvalidOperationException("PatientName is required");
    }
}
