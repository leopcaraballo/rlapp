namespace WaitingRoom.Application.CommandHandlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Exceptions;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Commands;

public sealed class ActivateConsultingRoomCommandHandler
{
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public ActivateConsultingRoomCommandHandler(
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _eventStore = eventStore ?? throw new ArgumentNullException(nameof(eventStore));
        _eventPublisher = eventPublisher ?? throw new ArgumentNullException(nameof(eventPublisher));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<int> HandleAsync(
        ActivateConsultingRoomCommand command,
        CancellationToken cancellationToken = default)
    {
        var queue = await _eventStore.LoadAsync<WaitingQueue>(command.ServiceId, cancellationToken)
            ?? throw new AggregateNotFoundException(command.ServiceId);

        var metadata = EventMetadata.CreateNew(
            aggregateId: command.ServiceId,
            actor: command.Actor,
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        var request = new ActivateConsultingRoomRequest
        {
            ConsultingRoomId = command.ConsultingRoomId,
            ActivatedAt = _clock.UtcNow,
            Actor = command.Actor,
            Metadata = metadata
        };

        queue.ActivateConsultingRoom(request);

        var eventsToPublish = queue.UncommittedEvents.ToList();
        await _eventStore.SaveAsync(queue, cancellationToken);

        if (eventsToPublish.Count > 0)
            await _eventPublisher.PublishAsync(eventsToPublish, cancellationToken);

        return eventsToPublish.Count;
    }
}
