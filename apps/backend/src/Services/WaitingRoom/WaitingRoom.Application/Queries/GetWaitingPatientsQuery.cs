namespace WaitingRoom.Application.Queries;

using MediatR;

public sealed record GetWaitingPatientsQuery() : IRequest<IEnumerable<WaitingPatientResponse>>;

public sealed record WaitingPatientResponse
{
    public required string PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string Status { get; init; }
    public DateTime WaitingStartedAt { get; init; }
}
