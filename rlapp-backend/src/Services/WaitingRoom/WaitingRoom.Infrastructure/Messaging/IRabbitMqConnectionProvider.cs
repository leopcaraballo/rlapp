namespace WaitingRoom.Infrastructure.Messaging;

using RabbitMQ.Client;

public interface IRabbitMqConnectionProvider
{
    /// <summary>
    /// Create a new channel/model from a managed connection. Callers are responsible for disposing the returned IModel.
    /// </summary>
    IModel CreateModel();

    /// <summary>
    /// Dispose the underlying connection provider.
    /// </summary>
    void Dispose();
}
