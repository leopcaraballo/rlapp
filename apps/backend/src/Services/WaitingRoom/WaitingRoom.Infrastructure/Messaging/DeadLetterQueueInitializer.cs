namespace WaitingRoom.Infrastructure.Messaging;

using RabbitMQ.Client;
using Microsoft.Extensions.Logging;

/// <summary>
/// Initializes RabbitMQ dead letter exchange and queue infrastructure.
///
/// Called during application startup to ensure DLX topology exists.
/// All operations are idempotent (safe to call multiple times).
///
/// Topology created:
/// - Exchange: rlapp.events.dlx (fanout, durable)
/// - Queue: rlapp-dead-letter-queue (durable, 30-day TTL)
/// - Binding: exchange → queue
///
/// // HUMAN CHECK: verify dead letter TTL (30 days) aligns with compliance requirements
/// for clinical event retention in your jurisdiction
/// </summary>
public sealed class DeadLetterQueueInitializer
{
    private readonly IRabbitMqConnectionProvider _connectionProvider;
    private readonly ILogger<DeadLetterQueueInitializer> _logger;

    public DeadLetterQueueInitializer(
        IRabbitMqConnectionProvider connectionProvider,
        ILogger<DeadLetterQueueInitializer> logger)
    {
        _connectionProvider = connectionProvider ?? throw new ArgumentNullException(nameof(connectionProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Creates the dead letter exchange, queue, and binding.
    /// Idempotent — safe to call on every startup.
    /// </summary>
    public void Initialize()
    {
        try
        {
            using var channel = _connectionProvider.CreateModel();

            // Declare dead letter exchange (fanout — routes to all bound queues)
            channel.ExchangeDeclare(
                exchange: DeadLetterConfiguration.DeadLetterExchangeName,
                type: ExchangeType.Fanout,
                durable: true,
                autoDelete: false,
                arguments: null);

            // Declare dead letter queue with TTL
            var queueArgs = new Dictionary<string, object>
            {
                { "x-message-ttl", DeadLetterConfiguration.DeadLetterTtlMs }
            };

            channel.QueueDeclare(
                queue: DeadLetterConfiguration.DeadLetterQueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: queueArgs);

            // Bind dead letter queue to DLX exchange
            channel.QueueBind(
                queue: DeadLetterConfiguration.DeadLetterQueueName,
                exchange: DeadLetterConfiguration.DeadLetterExchangeName,
                routingKey: DeadLetterConfiguration.DeadLetterRoutingKey,
                arguments: null);

            _logger.LogInformation(
                "Dead letter queue infrastructure initialized. Exchange: {Exchange}, Queue: {Queue}, TTL: {TtlDays} days",
                DeadLetterConfiguration.DeadLetterExchangeName,
                DeadLetterConfiguration.DeadLetterQueueName,
                DeadLetterConfiguration.DeadLetterTtlMs / (24 * 60 * 60 * 1000));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to initialize dead letter queue infrastructure. " +
                "Poison messages may not be captured until this is resolved.");
            throw;
        }
    }
}
