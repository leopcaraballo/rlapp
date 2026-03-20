namespace WaitingRoom.Application.Queries;

using MediatR;

public sealed record GetCashierQueueQuery() : IRequest<IEnumerable<CashierQueuePatientResponse>>;

public sealed record CashierQueuePatientResponse
{
    public required string PatientId { get; init; }
    public required string PatientName { get; init; }
    public decimal PaymentAmount { get; init; }
    public required string Status { get; init; }
}
