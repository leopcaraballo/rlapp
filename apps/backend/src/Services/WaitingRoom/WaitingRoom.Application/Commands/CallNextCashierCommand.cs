namespace WaitingRoom.Application.Commands;

public sealed record CallNextCashierCommand
{
    public required string ServiceId { get; init; }
    public required string Actor { get; init; }
    public string? CashierDeskId { get; init; }
    public string? CorrelationId { get; init; }
}
