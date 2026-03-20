namespace WaitingRoom.Application.Queries;

using MediatR;
using WaitingRoom.Domain.Aggregates;

public sealed record GetPatientStateQuery(string PatientId) : IRequest<PatientStateResponse?>;

public sealed record PatientStateResponse
{
    public required string PatientId { get; init; }
    public required string Status { get; init; }
    public string? ConsultingRoomId { get; init; }
}
