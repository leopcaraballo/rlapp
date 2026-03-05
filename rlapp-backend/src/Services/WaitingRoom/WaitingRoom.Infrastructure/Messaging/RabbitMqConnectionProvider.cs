namespace WaitingRoom.Infrastructure.Messaging;

using RabbitMQ.Client;

/// <summary>
/// Singleton connection provider that manages a single RabbitMQ connection and creates channels on demand.
/// </summary>
public sealed class RabbitMqConnectionProvider : IRabbitMqConnectionProvider, IDisposable
{
    private readonly RabbitMqOptions _options;
    private readonly IConnection _connection;

    public RabbitMqConnectionProvider(RabbitMqOptions options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));

        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost,
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
    }

    public IModel CreateModel()
    {
        return _connection.CreateModel();
    }

    public void Dispose()
    {
        try
        {
            _connection?.Close();
            _connection?.Dispose();
        }
        catch
        {
            // swallow - best effort
        }
    }

    void IRabbitMqConnectionProvider.Dispose() => Dispose();
}
