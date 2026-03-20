namespace WaitingRoom.Application.Commands;

using MediatR;

public sealed record MarkPatientAsWaitingCommand : IRequest<MarkPatientAsWaitingResponse>
{
    public required string PatientId { get; init; }
    public required string Actor { get; init; }
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public string? IdempotencyKey { get; init; }
}

public sealed record MarkPatientAsWaitingResponse
{
    public bool Success { get; init; }
}
