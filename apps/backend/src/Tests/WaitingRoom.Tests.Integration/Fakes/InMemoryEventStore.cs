namespace WaitingRoom.Tests.Integration.Fakes;

using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

/// <summary>
/// In-memory implementation of IEventStore for integration tests.
/// Replaces PostgresEventStore with a zero-dependency in-memory store.
/// </summary>
internal sealed class InMemoryEventStore : IEventStore
{
    private readonly ConcurrentDictionary<string, List<DomainEvent>> _streams =
        new(StringComparer.Ordinal);

    public Task<IEnumerable<DomainEvent>> GetEventsAsync(
        string aggregateId,
        CancellationToken cancellationToken = default)
    {
        var events = _streams.TryGetValue(aggregateId, out var list)
            ? list.AsEnumerable()
            : Enumerable.Empty<DomainEvent>();

        return Task.FromResult(events);
    }

    public Task SaveAsync<T>(
        T aggregate,
        CancellationToken cancellationToken = default) where T : AggregateRoot
    {
        if (!aggregate.HasUncommittedEvents)
            return Task.CompletedTask;

        var uncommitted = aggregate.UncommittedEvents.ToList();

        _streams.AddOrUpdate(
            aggregate.Id,
            _ => new List<DomainEvent>(uncommitted),
            (_, existing) =>
            {
                existing.AddRange(uncommitted);
                return existing;
            });

        aggregate.ClearUncommittedEvents();
        return Task.CompletedTask;
    }

    public Task<T?> LoadAsync<T>(
        string aggregateId,
        CancellationToken cancellationToken = default) where T : AggregateRoot
    {
        if (!_streams.TryGetValue(aggregateId, out var events) || events.Count == 0)
            return Task.FromResult<T?>(null);

        var aggregate = AggregateRoot.LoadFromHistory<T>(aggregateId, events);
        return Task.FromResult<T?>(aggregate);
    }

    public Task<IEnumerable<DomainEvent>> GetAllEventsAsync(
        CancellationToken cancellationToken = default)
    {
        var allEvents = _streams.Values
            .SelectMany(e => e)
            .OrderBy(e => e.Metadata.OccurredAt)
            .AsEnumerable();

        return Task.FromResult(allEvents);
    }
}
