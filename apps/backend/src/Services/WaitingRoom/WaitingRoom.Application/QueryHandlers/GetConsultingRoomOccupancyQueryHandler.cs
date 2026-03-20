namespace WaitingRoom.Application.QueryHandlers;

using MediatR;
using WaitingRoom.Application.Ports;
using WaitingRoom.Application.Queries;

public sealed class GetConsultingRoomOccupancyQueryHandler : IRequestHandler<GetConsultingRoomOccupancyQuery, IEnumerable<ConsultingRoomOccupancyResponse>>
{
    private readonly IConsultingRoomOccupancyRepository _repository;

    public GetConsultingRoomOccupancyQueryHandler(IConsultingRoomOccupancyRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<IEnumerable<ConsultingRoomOccupancyResponse>> Handle(GetConsultingRoomOccupancyQuery request, CancellationToken cancellationToken)
    {
        var rows = await _repository.GetAllAsync(cancellationToken);
        return rows.Select(r => new ConsultingRoomOccupancyResponse
        {
            RoomId = r.RoomId,
            RoomName = r.RoomName,
            IsActive = r.IsActive,
            CurrentPatientId = r.CurrentPatientId,
            CurrentPatientName = r.PatientName
        });
    }
}
