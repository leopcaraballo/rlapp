namespace WaitingRoom.Application.Commands;

using MediatR;

public sealed record CompletePatientCommand : IRequest<CompletePatientResponse>
{
    public required string PatientId { get; init; }
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public string? IdempotencyKey { get; init; }
}

public sealed record CompletePatientResponse
{
    public bool Success { get; init; }
}
