namespace WaitingRoom.Application.Commands;

public sealed record MarkPaymentPendingCommand
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required string Actor { get; init; }
    public string? Reason { get; init; }
    public string? CorrelationId { get; init; }
}
