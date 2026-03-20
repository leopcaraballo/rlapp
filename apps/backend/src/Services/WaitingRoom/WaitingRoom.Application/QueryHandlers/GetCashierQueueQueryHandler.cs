namespace WaitingRoom.Application.QueryHandlers;

using MediatR;
using WaitingRoom.Application.Ports;
using WaitingRoom.Application.Queries;

public sealed class GetCashierQueueQueryHandler : IRequestHandler<GetCashierQueueQuery, IEnumerable<CashierQueuePatientResponse>>
{
    private readonly ICashierQueueRepository _repository;

    public GetCashierQueueQueryHandler(ICashierQueueRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<IEnumerable<CashierQueuePatientResponse>> Handle(GetCashierQueueQuery request, CancellationToken cancellationToken)
    {
        var rows = await _repository.GetAllAsync(cancellationToken);
        return rows.Select(r => new CashierQueuePatientResponse
        {
            PatientId = r.PatientId,
            PatientName = r.PatientName,
            PaymentAmount = r.PaymentAmount,
            Status = "At Cashier"
        });
    }
}
