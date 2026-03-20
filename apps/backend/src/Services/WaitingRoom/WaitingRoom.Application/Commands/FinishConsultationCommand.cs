namespace WaitingRoom.Application.Commands;

using MediatR;

public sealed record FinishConsultationCommand : IRequest<FinishConsultationResponse>
{
    public required string ServiceId { get; init; }
    public required string PatientId { get; init; }
    public string? Notes { get; init; }
    public required string Actor { get; init; }
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public string? IdempotencyKey { get; init; }
}

public sealed record FinishConsultationResponse
{
    public bool Success { get; init; }
}
