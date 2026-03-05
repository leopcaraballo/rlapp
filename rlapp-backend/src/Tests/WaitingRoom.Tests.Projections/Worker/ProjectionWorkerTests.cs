namespace WaitingRoom.Tests.Projections.Worker;

using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using WaitingRoom.Domain.Events;
using WaitingRoom.Projections.EventSubscription;
using WaitingRoom.Projections.Processing;
using WaitingRoom.Projections.Worker;
using BuildingBlocks.Observability;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Projections.Abstractions;
using Xunit;

public class ProjectionWorkerTests
{
    [Fact]
    public async Task OnEventReceived_WhenProcessorThrows_LogsError()
    {
        // Arrange
        var subscriberMock = new Mock<IProjectionEventSubscriber>();

        var projectionMock = new Mock<IProjection>();
        projectionMock
            .Setup(p => p.ProcessEventAsync(It.IsAny<DomainEvent>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("processor-failure"));

        var lagTrackerMock = new Mock<IEventLagTracker>();

        var procLoggerMock = new Mock<ILogger<ProjectionEventProcessor>>();
        var workerLoggerMock = new Mock<ILogger<ProjectionWorker>>();

        var processor = new ProjectionEventProcessor(
            projectionMock.Object,
            lagTrackerMock.Object,
            procLoggerMock.Object);

        var worker = new ProjectionWorker(subscriberMock.Object, processor, workerLoggerMock.Object);

        var @event = new PatientCheckedIn
        {
            QueueId = "queue-1",
            PatientId = "PAT-1",
            PatientName = "Test",
            Priority = "High",
            ConsultationType = "General",
            QueuePosition = 0,
            CheckInTime = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew("queue-1", "test")
        };

        var args = new EventReceivedArgs
        {
            Event = @event,
            ReceivedAt = DateTime.UtcNow,
            RoutingKey = "waiting_room.patient.checkedin"
        };

        // Act
        await worker.OnEventReceived(args, CancellationToken.None);

        // Assert: verify worker logger recorded an error
        workerLoggerMock.Verify(
            x => x.Log(
                It.Is<LogLevel>(l => l == LogLevel.Error),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Error processing event") || v.ToString().Contains("projection worker")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.AtLeastOnce);
    }
}
