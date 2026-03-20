namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Projections.Abstractions;

/// <summary>
/// Composite handler that delegates an event to multiple child handlers.
/// Useful when one event affects multiple read models.
/// </summary>
public sealed class CompositeProjectionHandler : IProjectionHandler
{
    private readonly IEnumerable<IProjectionHandler> _handlers;

    public string EventName => "CompositeHandler";

    public CompositeProjectionHandler(params IProjectionHandler[] handlers)
    {
        _handlers = handlers ?? throw new ArgumentNullException(nameof(handlers));
    }

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        foreach (var handler in _handlers)
        {
            await handler.HandleAsync(@event, context, cancellationToken);
        }
    }
}
