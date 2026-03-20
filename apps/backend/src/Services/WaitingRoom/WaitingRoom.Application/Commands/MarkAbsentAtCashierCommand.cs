namespace WaitingRoom.Application.Commands;

public sealed record MarkAbsentAtCashierCommand
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required string Actor { get; init; }
    public string? CorrelationId { get; init; }
}
