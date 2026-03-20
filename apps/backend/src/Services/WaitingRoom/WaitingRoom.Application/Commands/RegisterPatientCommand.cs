namespace WaitingRoom.Application.Commands;

using MediatR;

public sealed record RegisterPatientCommand : IRequest<RegisterPatientResponse>
{
    public required string PatientIdentity { get; init; }
    public required string PatientName { get; init; }
    public string? PhoneNumber { get; init; }
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public string? IdempotencyKey { get; init; }
}

public sealed record RegisterPatientResponse
{
    public required string PatientId { get; init; }
    public required string Message { get; init; }
}
