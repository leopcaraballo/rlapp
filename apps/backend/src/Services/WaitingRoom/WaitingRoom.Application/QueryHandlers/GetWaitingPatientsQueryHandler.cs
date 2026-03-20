namespace WaitingRoom.Application.QueryHandlers;

using MediatR;
using WaitingRoom.Application.Ports;
using WaitingRoom.Application.Queries;

public sealed class GetWaitingPatientsQueryHandler : IRequestHandler<GetWaitingPatientsQuery, IEnumerable<WaitingPatientResponse>>
{
    private readonly IPatientStateRepository _repository;

    public GetWaitingPatientsQueryHandler(IPatientStateRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<IEnumerable<WaitingPatientResponse>> Handle(GetWaitingPatientsQuery request, CancellationToken cancellationToken)
    {
        var rows = await _repository.GetAllWaitingAsync(cancellationToken);
        return rows.Select(r => new WaitingPatientResponse
        {
            PatientId = r.PatientId,
            PatientName = r.PatientName,
            Status = r.CurrentState,
            WaitingStartedAt = r.WaitingStartedAt ?? r.CreatedAt
        });
    }
}
