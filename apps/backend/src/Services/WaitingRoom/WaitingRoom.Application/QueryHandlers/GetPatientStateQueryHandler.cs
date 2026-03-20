namespace WaitingRoom.Application.QueryHandlers;

using MediatR;
using WaitingRoom.Application.Ports;
using WaitingRoom.Application.Queries;

public sealed class GetPatientStateQueryHandler : IRequestHandler<GetPatientStateQuery, PatientStateResponse?>
{
    private readonly IPatientStateRepository _repository;

    public GetPatientStateQueryHandler(IPatientStateRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<PatientStateResponse?> Handle(GetPatientStateQuery request, CancellationToken cancellationToken)
    {
        var row = await _repository.GetByIdAsync(request.PatientId, cancellationToken);
        if (row == null) return null;

        return new PatientStateResponse
        {
            PatientId = row.PatientId,
            Status = row.CurrentState,
            ConsultingRoomId = row.AssignedRoomId
        };
    }
}
