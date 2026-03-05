namespace WaitingRoom.Tests.Integration.Messaging;

using System.Text;
using Xunit;
using Moq;
using FluentAssertions;
using RabbitMQ.Client;
using WaitingRoom.Infrastructure.Messaging;
using WaitingRoom.Infrastructure.Serialization;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Events;
using BuildingBlocks.EventSourcing;

/// <summary>
/// Tests de integracion para RabbitMqEventPublisher.
/// Validan la interaccion completa: serializacion, publicacion y outbox.
///
/// HUMAN CHECK: Estos tests usan mocks de IModel. Para tests con RabbitMQ real,
///              considerar Testcontainers con imagen rabbitmq:3.12-management-alpine.
/// </summary>
public sealed class RabbitMqEventPublisherTests
{
    private readonly Mock<IRabbitMqConnectionProvider> _connectionProviderMock;
    private readonly Mock<IModel> _channelMock;
    private readonly Mock<IBasicProperties> _propertiesMock;
    private readonly Mock<IOutboxStore> _outboxStoreMock;
    private readonly EventSerializer _serializer;
    private readonly RabbitMqOptions _options;

    public RabbitMqEventPublisherTests()
    {
        _connectionProviderMock = new Mock<IRabbitMqConnectionProvider>();
        _channelMock = new Mock<IModel>();
        _propertiesMock = new Mock<IBasicProperties>();
        _outboxStoreMock = new Mock<IOutboxStore>();
        _serializer = new EventSerializer(EventTypeRegistry.CreateDefault());
        _options = new RabbitMqOptions
        {
            ExchangeName = "test.events",
            ExchangeType = "topic"
        };

        _channelMock
            .Setup(c => c.CreateBasicProperties())
            .Returns(_propertiesMock.Object);

        _connectionProviderMock
            .Setup(p => p.CreateModel())
            .Returns(_channelMock.Object);
    }

    [Fact]
    public async Task PublishAsync_ConEventoUnico_DeclaraExchangeYPublicaMensaje()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object, _outboxStoreMock.Object);
        var evt = CreateEvent();

        await publisher.PublishAsync(evt);

        _channelMock.Verify(c => c.ExchangeDeclare(
            _options.ExchangeName, _options.ExchangeType, true, false, null), Times.Once);
        _channelMock.Verify(c => c.BasicPublish(
            _options.ExchangeName,
            It.Is<string>(rk => rk == evt.EventName),
            It.IsAny<bool>(),
            It.IsAny<IBasicProperties>(),
            It.IsAny<ReadOnlyMemory<byte>>()), Times.Once);
    }

    [Fact]
    public async Task PublishAsync_ConMultiplesEventos_PublicaTodos()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object, _outboxStoreMock.Object);
        var events = new List<DomainEvent> { CreateEvent(), CreateEvent(), CreateEvent() };

        await publisher.PublishAsync(events);

        _channelMock.Verify(c => c.BasicPublish(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(),
            It.IsAny<IBasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>()), Times.Exactly(3));
    }

    [Fact]
    public async Task PublishAsync_Exitoso_MarcaOutboxComoDispachado()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object, _outboxStoreMock.Object);
        _outboxStoreMock.Setup(o => o.MarkDispatchedAsync(
            It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await publisher.PublishAsync(CreateEvent());

        _outboxStoreMock.Verify(o => o.MarkDispatchedAsync(
            It.Is<IReadOnlyList<Guid>>(ids => ids.Count == 1),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PublishAsync_SinOutboxStore_NoLanzaExcepcion()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object, outboxStore: null);

        var act = () => publisher.PublishAsync(CreateEvent());

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task PublishAsync_FallaEnRabbitMq_MarcaOutboxComoFallido()
    {
        _channelMock.Setup(c => c.BasicPublish(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(),
            It.IsAny<IBasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>()))
            .Throws(new Exception("Conexion perdida"));
        _outboxStoreMock.Setup(o => o.MarkFailedAsync(
            It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<string>(),
            It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object, _outboxStoreMock.Object);

        await Assert.ThrowsAsync<Exception>(() => publisher.PublishAsync(CreateEvent()));

        _outboxStoreMock.Verify(o => o.MarkFailedAsync(
            It.Is<IReadOnlyList<Guid>>(ids => ids.Count == 1),
            It.Is<string>(msg => msg.Contains("Conexion perdida")),
            It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PublishAsync_ListaVacia_NoPublicaNada()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object);

        await publisher.PublishAsync(Array.Empty<DomainEvent>());

        _channelMock.Verify(c => c.BasicPublish(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(),
            It.IsAny<IBasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>()), Times.Never);
    }

    [Fact]
    public async Task PublishAsync_EstablecePropertiesCorrectas()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object);
        var evt = CreateEvent();

        await publisher.PublishAsync(evt);

        _propertiesMock.VerifySet(p => p.MessageId = evt.Metadata.EventId, Times.Once);
        _propertiesMock.VerifySet(p => p.CorrelationId = evt.Metadata.CorrelationId, Times.Once);
        _propertiesMock.VerifySet(p => p.Type = evt.EventName, Times.Once);
        _propertiesMock.VerifySet(p => p.ContentType = "application/json", Times.Once);
        _propertiesMock.VerifySet(p => p.DeliveryMode = 2, Times.Once);
    }

    [Fact]
    public async Task PublishAsync_EventosNulos_LanzaArgumentNullException()
    {
        var publisher = new RabbitMqEventPublisher(
            _options, _serializer, _connectionProviderMock.Object);

        await Assert.ThrowsAsync<ArgumentNullException>(
            () => publisher.PublishAsync((IEnumerable<DomainEvent>)null!));
    }

    [Fact]
    public void Constructor_OptionsNulas_LanzaArgumentNullException()
    {
        var act = () => new RabbitMqEventPublisher(null!, _serializer, _connectionProviderMock.Object);
        act.Should().Throw<ArgumentNullException>().WithParameterName("options");
    }

    [Fact]
    public void Constructor_SerializerNulo_LanzaArgumentNullException()
    {
        var act = () => new RabbitMqEventPublisher(_options, null!, _connectionProviderMock.Object);
        act.Should().Throw<ArgumentNullException>().WithParameterName("serializer");
    }

    private static PatientCheckedIn CreateEvent()
    {
        var aggregateId = Guid.NewGuid().ToString();
        return new PatientCheckedIn
        {
            QueueId = aggregateId,
            PatientId = Guid.NewGuid().ToString(),
            PatientName = "Juan Garcia Lopez",
            Priority = "Normal",
            ConsultationType = "General",
            QueuePosition = 1,
            CheckInTime = DateTime.UtcNow,
            Metadata = new EventMetadata
            {
                EventId = Guid.NewGuid().ToString(),
                OccurredAt = DateTime.UtcNow,
                AggregateId = aggregateId,
                CorrelationId = Guid.NewGuid().ToString(),
                Version = 1
            }
        };
    }
}
