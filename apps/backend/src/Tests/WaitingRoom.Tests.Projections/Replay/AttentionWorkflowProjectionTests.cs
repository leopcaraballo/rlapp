namespace WaitingRoom.Tests.Projections.Replay;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using WaitingRoom.Domain.Events;
using WaitingRoom.Infrastructure.Projections;
using WaitingRoom.Projections.Handlers;
using Xunit;

public sealed class AttentionWorkflowProjectionTests
{
    [Fact]
    public async Task ClaimCallComplete_UpdatesNextTurnAndHistory()
    {
        var context = new InMemoryAtencionProjectionContext(new NullLogger<InMemoryAtencionProjectionContext>());
        var checkedInHandler = new PatientCheckedInProjectionHandler();
        var cashierCalledHandler = new PatientCalledAtCashierProjectionHandler();
        var paymentValidatedHandler = new PatientPaymentValidatedProjectionHandler();
        var claimedHandler = new PatientClaimedForAttentionProjectionHandler();
        var calledHandler = new PatientCalledProjectionHandler();
        var completedHandler = new PatientAttentionCompletedProjectionHandler();

        var serviceId = "queue-1";
        var patientId = "p-1";

        await checkedInHandler.HandleAsync(CreateCheckedIn(serviceId, patientId), context);
        await cashierCalledHandler.HandleAsync(CreateCashierCalled(serviceId, patientId), context);
        await paymentValidatedHandler.HandleAsync(CreatePaymentValidated(serviceId, patientId), context);
        await claimedHandler.HandleAsync(CreateClaimed(serviceId, patientId), context);
        await calledHandler.HandleAsync(CreateCalled(serviceId, patientId), context);

        var nextTurn = await context.GetNextTurnViewAsync(serviceId);
        nextTurn.Should().NotBeNull();
        nextTurn!.Status.Should().Be("called");

        await completedHandler.HandleAsync(CreateCompleted(serviceId, patientId), context);

        var nextAfterCompletion = await context.GetNextTurnViewAsync(serviceId);
        nextAfterCompletion.Should().BeNull();

        var history = await context.GetRecentAttentionHistoryAsync(serviceId, 10);
        history.Should().HaveCount(1);
        history[0].PatientId.Should().Be(patientId);
    }

    private static PatientCheckedIn CreateCheckedIn(string serviceId, string patientId) => new()
    {
        ServiceId = serviceId,
        PatientId = patientId,
        PatientName = "Patient",
        Priority = "high",
        ConsultationType = "General",
        QueuePosition = 0,
        TurnNumber = 1,
        CheckInTime = DateTime.UtcNow,
        Metadata = NewMetadata(serviceId)
    };

    private static PatientClaimedForAttention CreateClaimed(string serviceId, string patientId) => new()
    {
        ServiceId = serviceId,
        PatientId = patientId,
        PatientName = "Patient",
        Priority = "high",
        ConsultationType = "General",
        ClaimedAt = DateTime.UtcNow,
        TurnNumber = 1,
        Metadata = NewMetadata(serviceId)
    };

    private static PatientCalledAtCashier CreateCashierCalled(string serviceId, string patientId) => new()
    {
        ServiceId = serviceId,
        PatientId = patientId,
        PatientName = "Patient",
        Priority = "high",
        ConsultationType = "General",
        CalledAt = DateTime.UtcNow,
        TurnNumber = 1,
        Metadata = NewMetadata(serviceId)
    };

    private static PatientPaymentValidated CreatePaymentValidated(string serviceId, string patientId) => new()
    {
        ServiceId = serviceId,
        PatientId = patientId,
        PatientName = "Patient",
        Priority = "high",
        ConsultationType = "General",
        ValidatedAt = DateTime.UtcNow,
        TurnNumber = 1,
        Metadata = NewMetadata(serviceId)
    };

    private static PatientCalled CreateCalled(string serviceId, string patientId) => new()
    {
        ServiceId = serviceId,
        PatientId = patientId,
        CalledAt = DateTime.UtcNow,
        Metadata = NewMetadata(serviceId)
    };

    private static PatientAttentionCompleted CreateCompleted(string serviceId, string patientId) => new()
    {
        ServiceId = serviceId,
        PatientId = patientId,
        PatientName = "Patient",
        Priority = "high",
        ConsultationType = "General",
        CompletedAt = DateTime.UtcNow,
        Metadata = NewMetadata(serviceId)
    };

    private static EventMetadata NewMetadata(string aggregateId) => new()
    {
        AggregateId = aggregateId,
        EventId = Guid.NewGuid().ToString(),
        CorrelationId = Guid.NewGuid().ToString(),
        CausationId = Guid.NewGuid().ToString(),
        Actor = "system",
        IdempotencyKey = Guid.NewGuid().ToString(),
        OccurredAt = DateTime.UtcNow,
        Version = 1,
        SchemaVersion = 1
    };
}
