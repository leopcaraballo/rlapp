namespace WaitingRoom.Infrastructure.Messaging;

using System.Text;
using BuildingBlocks.EventSourcing;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;
using WaitingRoom.Application.Ports;
using WaitingRoom.Infrastructure.Serialization;

/// <summary>
/// RabbitMQ event publisher with retry logic and connection resilience.
///
/// Features:
/// - Publish with configurable retry attempts and exponential backoff
/// - Persistent messages (delivery mode 2) for durability
/// - Outbox integration for at-least-once delivery guarantee
/// - Schema version metadata on every published message
///
/// // HUMAN CHECK: verify retry logic for poison messages — evaluate whether
/// failed publishes should dead-letter or silently mark as failed in outbox
/// </summary>
internal sealed class RabbitMqEventPublisher : IEventPublisher
{
    private readonly RabbitMqOptions _options;
    private readonly EventSerializer _serializer;
    private readonly IOutboxStore? _outboxStore;
    private readonly IRabbitMqConnectionProvider _connectionProvider;

    /// <summary>
    /// Maximum publish retry attempts before propagating the exception.
    /// </summary>
    private const int MaxPublishRetries = 3;

    /// <summary>
    /// Base delay between publish retries in milliseconds (exponential backoff).
    /// </summary>
    private const int BaseRetryDelayMs = 100;

    public RabbitMqEventPublisher(
        RabbitMqOptions options,
        EventSerializer serializer,
        IRabbitMqConnectionProvider connectionProvider,
        IOutboxStore? outboxStore = null)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _serializer = serializer ?? throw new ArgumentNullException(nameof(serializer));
        _connectionProvider = connectionProvider ?? throw new ArgumentNullException(nameof(connectionProvider));
        _outboxStore = outboxStore;
    }

    public Task PublishAsync(DomainEvent @event, CancellationToken cancellationToken = default) =>
        PublishAsync(new[] { @event }, cancellationToken);

    public async Task PublishAsync(
        IEnumerable<DomainEvent> events,
        CancellationToken cancellationToken = default)
    {
        if (events == null)
            throw new ArgumentNullException(nameof(events));

        var eventList = events.ToList();
        if (eventList.Count == 0)
            return;

        cancellationToken.ThrowIfCancellationRequested();

        var eventIds = eventList.Select(e => Guid.Parse(e.Metadata.EventId)).ToList();

        try
        {
            await PublishWithRetryAsync(eventList, cancellationToken);

            if (_outboxStore != null)
                await _outboxStore.MarkDispatchedAsync(eventIds, cancellationToken);
        }
        catch (Exception ex)
        {
            if (_outboxStore != null)
            {
                await _outboxStore.MarkFailedAsync(
                    eventIds,
                    ex.Message,
                    retryAfter: TimeSpan.FromSeconds(30),
                    cancellationToken: cancellationToken);
            }

            throw;
        }
    }

    /// <summary>
    /// Publishes events with retry logic and exponential backoff.
    /// Handles transient RabbitMQ failures (broker unreachable, channel closed).
    ///
    /// // HUMAN CHECK: verify exponential backoff parameters under high-throughput scenarios
    /// </summary>
    private async Task PublishWithRetryAsync(
        List<DomainEvent> eventList,
        CancellationToken cancellationToken)
    {
        Exception? lastException = null;

        for (var attempt = 0; attempt < MaxPublishRetries; attempt++)
        {
            try
            {
                cancellationToken.ThrowIfCancellationRequested();
                PublishBatch(eventList);
                return; // Success
            }
            catch (BrokerUnreachableException ex) when (attempt < MaxPublishRetries - 1)
            {
                lastException = ex;
                var delay = BaseRetryDelayMs * (int)Math.Pow(2, attempt);
                await Task.Delay(delay, cancellationToken);
            }
            catch (AlreadyClosedException ex) when (attempt < MaxPublishRetries - 1)
            {
                lastException = ex;
                var delay = BaseRetryDelayMs * (int)Math.Pow(2, attempt);
                await Task.Delay(delay, cancellationToken);
            }
        }

        throw lastException ?? new InvalidOperationException("Publish failed after retries");
    }

    /// <summary>
    /// Publishes a batch of events to RabbitMQ in a single channel.
    /// Each event includes schema_version metadata for forward compatibility.
    /// </summary>
    private void PublishBatch(List<DomainEvent> eventList)
    {
        using var channel = _connectionProvider.CreateModel();

        channel.ExchangeDeclare(
            exchange: _options.ExchangeName,
            type: _options.ExchangeType,
            durable: true,
            autoDelete: false);

        foreach (var @event in eventList)
        {
            var payload = _serializer.Serialize(@event);
            var body = Encoding.UTF8.GetBytes(payload);
            var properties = channel.CreateBasicProperties();

            properties.MessageId = @event.Metadata.EventId;
            properties.CorrelationId = @event.Metadata.CorrelationId;
            properties.Type = @event.EventName;
            properties.ContentType = "application/json";
            properties.DeliveryMode = 2; // Persistent

            // Schema version metadata for event evolution
            properties.Headers ??= new Dictionary<string, object>();
            properties.Headers["schema_version"] = "1.0";
            properties.Headers["source_service"] = "WaitingRoom";

            var timestamp = new DateTimeOffset(@event.Metadata.OccurredAt).ToUnixTimeSeconds();
            properties.Timestamp = new AmqpTimestamp(timestamp);

            channel.BasicPublish(
                exchange: _options.ExchangeName,
                routingKey: @event.EventName,
                basicProperties: properties,
                body: body);
        }
    }
}
