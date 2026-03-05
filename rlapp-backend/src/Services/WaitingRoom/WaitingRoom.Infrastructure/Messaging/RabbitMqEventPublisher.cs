namespace WaitingRoom.Infrastructure.Messaging;

using System.Text;
using BuildingBlocks.EventSourcing;
using Microsoft.Extensions.Logging;
using Polly.CircuitBreaker;
using RabbitMQ.Client;
using WaitingRoom.Application.Ports;
using WaitingRoom.Infrastructure.Serialization;

/// <summary>
/// Publicador de eventos de dominio hacia RabbitMQ con resiliencia integrada.
///
/// Estrategia de resiliencia:
/// - Retry con backoff exponencial + jitter (Polly v8)
/// - Circuit Breaker para protección contra cascadas de fallos
/// - Integración con Outbox Pattern para garantía de entrega
///
/// // HUMAN CHECK: Si el Circuit Breaker se abre con frecuencia en producción,
/// // revisar la salud de RabbitMQ y ajustar RabbitMqResilienceOptions.
/// // Monitorear métricas de Prometheus: rabbitmq_publish_retries_total,
/// // rabbitmq_circuit_breaker_state.
/// </summary>
internal sealed class RabbitMqEventPublisher : IEventPublisher
{
    private readonly RabbitMqOptions _options;
    private readonly EventSerializer _serializer;
    private readonly IOutboxStore? _outboxStore;
    private readonly IRabbitMqConnectionProvider _connectionProvider;
    private readonly RabbitMqResiliencePipeline? _resiliencePipeline;
    private readonly ILogger<RabbitMqEventPublisher> _logger;

    public RabbitMqEventPublisher(
        RabbitMqOptions options,
        EventSerializer serializer,
        IRabbitMqConnectionProvider connectionProvider,
        ILogger<RabbitMqEventPublisher> logger,
        RabbitMqResiliencePipeline? resiliencePipeline = null,
        IOutboxStore? outboxStore = null)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _serializer = serializer ?? throw new ArgumentNullException(nameof(serializer));
        _connectionProvider = connectionProvider ?? throw new ArgumentNullException(nameof(connectionProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _resiliencePipeline = resiliencePipeline;
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
            if (_resiliencePipeline != null)
            {
                await _resiliencePipeline.Pipeline.ExecuteAsync(
                    async token => { await PublishToRabbitMqAsync(eventList, token); },
                    cancellationToken);
            }
            else
            {
                await PublishToRabbitMqAsync(eventList, cancellationToken);
            }

            if (_outboxStore != null)
                await _outboxStore.MarkDispatchedAsync(eventIds, cancellationToken);
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogError(
                ex,
                "Circuit Breaker abierto — publicación de {Count} eventos diferida al Outbox",
                eventList.Count);

            if (_outboxStore != null)
            {
                await _outboxStore.MarkFailedAsync(
                    eventIds,
                    $"Circuit Breaker abierto: {ex.Message}",
                    retryAfter: TimeSpan.FromSeconds(60),
                    cancellationToken: cancellationToken);
            }

            throw;
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
    /// Operación de publicación pura hacia RabbitMQ (sin resiliencia).
    /// Extraída para que el pipeline de Polly envuelva únicamente la operación de I/O.
    /// </summary>
    private Task PublishToRabbitMqAsync(
        List<DomainEvent> eventList,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

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
            properties.DeliveryMode = 2;

            var timestamp = new DateTimeOffset(@event.Metadata.OccurredAt).ToUnixTimeSeconds();
            properties.Timestamp = new AmqpTimestamp(timestamp);

            channel.BasicPublish(
                exchange: _options.ExchangeName,
                routingKey: @event.EventName,
                basicProperties: properties,
                body: body);
        }

        _logger.LogDebug(
            "Publicados {Count} eventos al exchange {Exchange}",
            eventList.Count,
            _options.ExchangeName);

        return Task.CompletedTask;
    }
}
