namespace WaitingRoom.Tests.Integration.Fakes;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Ports;

/// <summary>
/// No-op implementation of IEventPublisher for integration tests.
/// Events are not dispatched to any broker; outbox is used indirectly.
/// </summary>
internal sealed class NoOpEventPublisher : IEventPublisher
{
    public Task PublishAsync(
        IEnumerable<DomainEvent> events,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task PublishAsync(
        DomainEvent @event,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
