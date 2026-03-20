namespace WaitingRoom.Application.Commands;

using MediatR;

public sealed record ValidatePaymentCommand : IRequest<ValidatePaymentResponse>
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public required string Actor { get; init; }
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public string? IdempotencyKey { get; init; }
}

public sealed record ValidatePaymentResponse
{
    public bool Success { get; init; }
}
