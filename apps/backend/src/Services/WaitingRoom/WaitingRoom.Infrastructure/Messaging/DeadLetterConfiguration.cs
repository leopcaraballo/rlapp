namespace WaitingRoom.Infrastructure.Messaging;

/// <summary>
/// Configuration for RabbitMQ dead letter exchange and queue.
///
/// Dead Letter Exchange (DLX) captures messages that:
/// - Are rejected (BasicNack with requeue=false)
/// - Expire (TTL exceeded)
/// - Exceed queue length limits
///
/// This enables poison message isolation and manual review workflows.
/// </summary>
public static class DeadLetterConfiguration
{
    /// <summary>
    /// Dead letter exchange name for events that fail processing.
    /// </summary>
    public const string DeadLetterExchangeName = "rlapp.events.dlx";

    /// <summary>
    /// Dead letter queue name for storing failed events.
    /// </summary>
    public const string DeadLetterQueueName = "rlapp-dead-letter-queue";

    /// <summary>
    /// Routing key for dead letter messages.
    /// </summary>
    public const string DeadLetterRoutingKey = "deadletter";

    /// <summary>
    /// Message TTL in the dead letter queue (7 days in milliseconds).
    /// After this period, messages are automatically removed.
    /// </summary>
    public const int DeadLetterTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days (604,800,000 ms)
}
