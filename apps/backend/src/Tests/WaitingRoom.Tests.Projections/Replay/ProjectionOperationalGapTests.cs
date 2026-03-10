namespace WaitingRoom.Tests.Projections.Replay;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Events;
using WaitingRoom.Infrastructure.Projections;
using WaitingRoom.Projections.Implementations;
using Xunit;

public sealed class ProjectionOperationalGapTests
{
    [Fact]
    public async Task PaymentPending_UpdatesNextTurnWithoutRequeueingPatient()
    {
        var (engine, context) = CreateEngine();
        var queueId = "queue-ops-1";
        var patientId = "patient-1";

        await engine.ProcessEventsAsync(
        [
            CreateCheckedIn(queueId, patientId, 1),
            CreateCashierCalled(queueId, patientId, 2),
            CreatePaymentPending(queueId, patientId, 3)
        ]);

        var nextTurn = await context.GetNextTurnViewAsync(queueId);
        var queue = await context.GetQueueStateViewAsync(queueId);
        var monitor = await context.GetMonitorViewAsync(queueId);

        nextTurn.Should().NotBeNull();
        nextTurn!.Status.Should().Be("payment-pending");
        queue!.CurrentCount.Should().Be(0);
        monitor!.TotalPatientsWaiting.Should().Be(0);
    }

    [Fact]
    public async Task AbsentAtCashier_RequeuesPatientAndClearsNextTurn()
    {
        var (engine, context) = CreateEngine();
        var queueId = "queue-ops-2";
        var patientId = "patient-2";

        await engine.ProcessEventsAsync(
        [
            CreateCheckedIn(queueId, patientId, 1),
            CreateCashierCalled(queueId, patientId, 2),
            CreateAbsentAtCashier(queueId, patientId, 3)
        ]);

        var nextTurn = await context.GetNextTurnViewAsync(queueId);
        var queue = await context.GetQueueStateViewAsync(queueId);
        var monitor = await context.GetMonitorViewAsync(queueId);

        nextTurn.Should().BeNull();
        queue!.CurrentCount.Should().Be(1);
        queue.PatientsInQueue.Should().ContainSingle(p => p.PatientId == patientId);
        monitor!.TotalPatientsWaiting.Should().Be(1);
    }

    [Fact]
    public async Task CancelledByPayment_ClearsNextTurnWithoutReturningPatientToQueue()
    {
        var (engine, context) = CreateEngine();
        var queueId = "queue-ops-3";
        var patientId = "patient-3";

        await engine.ProcessEventsAsync(
        [
            CreateCheckedIn(queueId, patientId, 1),
            CreateCashierCalled(queueId, patientId, 2),
            CreatePaymentPending(queueId, patientId, 3),
            CreateCancelledByPayment(queueId, patientId, 4)
        ]);

        var nextTurn = await context.GetNextTurnViewAsync(queueId);
        var queue = await context.GetQueueStateViewAsync(queueId);
        var monitor = await context.GetMonitorViewAsync(queueId);

        nextTurn.Should().BeNull();
        queue!.CurrentCount.Should().Be(0);
        monitor!.TotalPatientsWaiting.Should().Be(0);
    }

    [Fact]
    public async Task AbsentAtConsultation_RequeuesPatientAndClearsMedicalTurn()
    {
        var (engine, context) = CreateEngine();
        var queueId = "queue-ops-4";
        var patientId = "patient-4";

        await engine.ProcessEventsAsync(
        [
            CreateCheckedIn(queueId, patientId, 1),
            CreateCashierCalled(queueId, patientId, 2),
            CreatePaymentValidated(queueId, patientId, 3),
            CreateClaimed(queueId, patientId, 4),
            CreateAbsentAtConsultation(queueId, patientId, 5)
        ]);

        var nextTurn = await context.GetNextTurnViewAsync(queueId);
        var queue = await context.GetQueueStateViewAsync(queueId);
        var monitor = await context.GetMonitorViewAsync(queueId);

        nextTurn.Should().BeNull();
        queue!.CurrentCount.Should().Be(1);
        queue.PatientsInQueue.Should().ContainSingle(p => p.PatientId == patientId);
        monitor!.TotalPatientsWaiting.Should().Be(1);
    }

    [Fact]
    public async Task CancelledByAbsence_ClearsMedicalTurnWithoutReturningPatientToQueue()
    {
        var (engine, context) = CreateEngine();
        var queueId = "queue-ops-5";
        var patientId = "patient-5";

        await engine.ProcessEventsAsync(
        [
            CreateCheckedIn(queueId, patientId, 1),
            CreateCashierCalled(queueId, patientId, 2),
            CreatePaymentValidated(queueId, patientId, 3),
            CreateClaimed(queueId, patientId, 4),
            CreateCancelledByAbsence(queueId, patientId, 5)
        ]);

        var nextTurn = await context.GetNextTurnViewAsync(queueId);
        var queue = await context.GetQueueStateViewAsync(queueId);
        var monitor = await context.GetMonitorViewAsync(queueId);
        var history = await context.GetRecentAttentionHistoryAsync(queueId, 10);

        nextTurn.Should().BeNull();
        queue!.CurrentCount.Should().Be(0);
        monitor!.TotalPatientsWaiting.Should().Be(0);
        history.Should().BeEmpty();
    }

    private static (WaitingRoomProjectionEngine Engine, InMemoryWaitingRoomProjectionContext Context) CreateEngine()
    {
        var context = new InMemoryWaitingRoomProjectionContext(new NullLogger<InMemoryWaitingRoomProjectionContext>());
        var eventStore = new Mock<IEventStore>();
        var engine = new WaitingRoomProjectionEngine(
            context,
            eventStore.Object,
            new NullLogger<WaitingRoomProjectionEngine>());

        return (engine, context);
    }

    private static PatientCheckedIn CreateCheckedIn(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        PatientName = $"Patient {patientId}",
        Priority = "high",
        ConsultationType = "General",
        QueuePosition = 0,
        CheckInTime = DateTime.UtcNow,
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientCalledAtCashier CreateCashierCalled(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        PatientName = $"Patient {patientId}",
        Priority = "high",
        ConsultationType = "General",
        CalledAt = DateTime.UtcNow,
        CashierDeskId = "cashier-1",
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientPaymentPending CreatePaymentPending(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        PatientName = $"Patient {patientId}",
        Priority = "high",
        ConsultationType = "General",
        PendingAt = DateTime.UtcNow,
        AttemptNumber = 1,
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientAbsentAtCashier CreateAbsentAtCashier(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        AbsentAt = DateTime.UtcNow,
        RetryNumber = 1,
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientCancelledByPayment CreateCancelledByPayment(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        CancelledAt = DateTime.UtcNow,
        Reason = "No payment",
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientPaymentValidated CreatePaymentValidated(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        PatientName = $"Patient {patientId}",
        Priority = "high",
        ConsultationType = "General",
        ValidatedAt = DateTime.UtcNow,
        PaymentReference = "PAY-001",
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientClaimedForAttention CreateClaimed(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        PatientName = $"Patient {patientId}",
        Priority = "high",
        ConsultationType = "General",
        ClaimedAt = DateTime.UtcNow,
        StationId = "station-1",
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientAbsentAtConsultation CreateAbsentAtConsultation(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        AbsentAt = DateTime.UtcNow,
        RetryNumber = 1,
        Metadata = NewMetadata(queueId, version)
    };

    private static PatientCancelledByAbsence CreateCancelledByAbsence(string queueId, string patientId, long version) => new()
    {
        QueueId = queueId,
        PatientId = patientId,
        CancelledAt = DateTime.UtcNow,
        TotalAbsences = 2,
        Metadata = NewMetadata(queueId, version)
    };

    private static EventMetadata NewMetadata(string aggregateId, long version) => new()
    {
        AggregateId = aggregateId,
        EventId = Guid.NewGuid().ToString(),
        CorrelationId = Guid.NewGuid().ToString(),
        CausationId = Guid.NewGuid().ToString(),
        Actor = "system",
        IdempotencyKey = Guid.NewGuid().ToString(),
        OccurredAt = DateTime.UtcNow,
        Version = version,
        SchemaVersion = 1
    };
}