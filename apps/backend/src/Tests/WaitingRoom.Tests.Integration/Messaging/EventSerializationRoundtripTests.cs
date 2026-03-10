namespace WaitingRoom.Tests.Integration.Messaging;

using Xunit;
using FluentAssertions;
using WaitingRoom.Infrastructure.Serialization;
using WaitingRoom.Domain.Events;
using BuildingBlocks.EventSourcing;

/// <summary>
/// Tests de roundtrip serializacion/deserializacion de eventos de dominio.
/// Garantizan compatibilidad entre publisher y subscriber.
/// </summary>
public sealed class EventSerializationRoundtripTests
{
    private readonly EventSerializer _serializer;

    public EventSerializationRoundtripTests()
    {
        _serializer = new EventSerializer(EventTypeRegistry.CreateDefault());
    }

    [Fact]
    public void Roundtrip_PatientCheckedIn_ConservaTodosLosCampos()
    {
        var original = new PatientCheckedIn
        {
            QueueId = "Q-001",
            PatientId = "PAT-001",
            PatientName = "Maria Fernanda Lopez",
            Priority = "Alta",
            ConsultationType = "Especialista",
            QueuePosition = 3,
            CheckInTime = DateTime.UtcNow,
            Metadata = CreateMetadata()
        };

        var json = _serializer.Serialize(original);
        var restored = _serializer.Deserialize(nameof(PatientCheckedIn), json);

        restored.Should().BeOfType<PatientCheckedIn>();
        var typed = (PatientCheckedIn)restored;
        typed.PatientId.Should().Be(original.PatientId);
        typed.PatientName.Should().Be(original.PatientName);
        typed.Priority.Should().Be(original.Priority);
        typed.ConsultationType.Should().Be(original.ConsultationType);
    }

    [Fact]
    public void Roundtrip_PatientCalledAtCashier_ConservaCampos()
    {
        var original = new PatientCalledAtCashier
        {
            QueueId = "Q-002",
            PatientId = "PAT-002",
            PatientName = "Carlos Perez",
            Priority = "Normal",
            ConsultationType = "General",
            CalledAt = DateTime.UtcNow,
            CashierDeskId = "CAJA-01",
            Metadata = CreateMetadata()
        };

        var json = _serializer.Serialize(original);
        var restored = _serializer.Deserialize(nameof(PatientCalledAtCashier), json);

        restored.Should().BeOfType<PatientCalledAtCashier>();
        var typed = (PatientCalledAtCashier)restored;
        typed.PatientId.Should().Be(original.PatientId);
        typed.CashierDeskId.Should().Be(original.CashierDeskId);
    }

    [Fact]
    public void Roundtrip_PatientPaymentValidated_ConservaCampos()
    {
        var original = new PatientPaymentValidated
        {
            QueueId = "Q-003",
            PatientId = "PAT-003",
            PatientName = "Ana Martinez",
            Priority = "Normal",
            ConsultationType = "General",
            ValidatedAt = DateTime.UtcNow,
            PaymentReference = "REF-12345",
            Metadata = CreateMetadata()
        };

        var json = _serializer.Serialize(original);
        var restored = _serializer.Deserialize(nameof(PatientPaymentValidated), json);

        restored.Should().BeOfType<PatientPaymentValidated>();
        var typed = (PatientPaymentValidated)restored;
        typed.PatientId.Should().Be(original.PatientId);
        typed.PaymentReference.Should().Be(original.PaymentReference);
    }

    [Fact]
    public void Roundtrip_PatientAttentionCompleted_ConservaCampos()
    {
        var original = new PatientAttentionCompleted
        {
            QueueId = "Q-004",
            PatientId = "PAT-004",
            PatientName = "Luis Rodriguez",
            Priority = "Normal",
            ConsultationType = "General",
            CompletedAt = DateTime.UtcNow,
            Outcome = "Favorable",
            Notes = "Paciente evoluciona positivamente",
            Metadata = CreateMetadata()
        };

        var json = _serializer.Serialize(original);
        var restored = _serializer.Deserialize(nameof(PatientAttentionCompleted), json);

        restored.Should().BeOfType<PatientAttentionCompleted>();
        var typed = (PatientAttentionCompleted)restored;
        typed.PatientId.Should().Be(original.PatientId);
        typed.Outcome.Should().Be(original.Outcome);
        typed.Notes.Should().Be(original.Notes);
    }

    [Fact]
    public void Roundtrip_ConsultingRoomActivated_ConservaCampos()
    {
        var original = new ConsultingRoomActivated
        {
            QueueId = "Q-005",
            ConsultingRoomId = "CONS-01",
            ActivatedAt = DateTime.UtcNow,
            Metadata = CreateMetadata()
        };

        var json = _serializer.Serialize(original);
        var restored = _serializer.Deserialize(nameof(ConsultingRoomActivated), json);

        restored.Should().BeOfType<ConsultingRoomActivated>();
        var typed = (ConsultingRoomActivated)restored;
        typed.ConsultingRoomId.Should().Be(original.ConsultingRoomId);
    }

    [Fact]
    public void Serialize_ProduceJsonValido()
    {
        var evt = new PatientCheckedIn
        {
            QueueId = "Q-JSON",
            PatientId = "PAT-JSON",
            PatientName = "Test JSON",
            Priority = "Normal",
            ConsultationType = "General",
            QueuePosition = 1,
            CheckInTime = DateTime.UtcNow,
            Metadata = CreateMetadata()
        };

        var json = _serializer.Serialize(evt);

        json.Should().NotBeNullOrWhiteSpace();
        json.Should().Contain("patientId");
        json.Should().Contain("PAT-JSON");
        json.Should().StartWith("{").And.EndWith("}");
    }

    [Fact]
    public void Deserialize_EventoDesconocido_LanzaInvalidOperationException()
    {
        var act = () => _serializer.Deserialize("EventoQueNoExiste", "{}");
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Deserialize_PayloadVacio_LanzaArgumentException()
    {
        var act = () => _serializer.Deserialize("PatientCheckedIn", "");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Serialize_EventoNulo_LanzaArgumentNullException()
    {
        var act = () => _serializer.Serialize(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Theory]
    [InlineData(nameof(WaitingQueueCreated))]
    [InlineData(nameof(ConsultingRoomActivated))]
    [InlineData(nameof(ConsultingRoomDeactivated))]
    [InlineData(nameof(PatientCheckedIn))]
    [InlineData(nameof(PatientCalledAtCashier))]
    [InlineData(nameof(PatientPaymentValidated))]
    [InlineData(nameof(PatientPaymentPending))]
    [InlineData(nameof(PatientAbsentAtCashier))]
    [InlineData(nameof(PatientCancelledByPayment))]
    [InlineData(nameof(PatientClaimedForAttention))]
    [InlineData(nameof(PatientAbsentAtConsultation))]
    [InlineData(nameof(PatientCalled))]
    [InlineData(nameof(PatientAttentionCompleted))]
    [InlineData(nameof(PatientCancelledByAbsence))]
    public void EventTypeRegistry_ContieneTodosLos14TiposDeEvento(string eventName)
    {
        var registry = EventTypeRegistry.CreateDefault();
        var eventType = registry.GetType(eventName);
        eventType.Should().NotBeNull();
        eventType.Name.Should().Be(eventName);
    }

    private static EventMetadata CreateMetadata() =>
        new()
        {
            EventId = Guid.NewGuid().ToString(),
            OccurredAt = DateTime.UtcNow,
            AggregateId = Guid.NewGuid().ToString(),
            CorrelationId = Guid.NewGuid().ToString(),
            Version = 1
        };
}
