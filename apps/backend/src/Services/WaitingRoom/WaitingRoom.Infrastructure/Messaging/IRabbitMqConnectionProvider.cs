namespace WaitingRoom.Infrastructure.Messaging;

using RabbitMQ.Client;

/// <summary>
/// Abstraction for RabbitMQ connection management.
/// Supports connection pooling, automatic reconnection, and health verification.
/// </summary>
public interface IRabbitMqConnectionProvider : IDisposable
{
    /// <summary>
    /// Create a new channel/model from a managed connection.
    /// If the underlying connection is closed, it will be automatically re-established.
    /// Callers are responsible for disposing the returned IModel.
    /// </summary>
    IModel CreateModel();

    /// <summary>
    /// Verifies whether the underlying connection is currently open and healthy.
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// Total number of reconnection attempts since startup.
    /// </summary>
    int ReconnectionCount { get; }
}
