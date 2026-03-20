namespace WaitingRoom.Tests.Application.CommandHandlers;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using Moq;
using WaitingRoom.Application.CommandHandlers;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Exceptions;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Domain.Exceptions;
using WaitingRoom.Domain.Events;
using WaitingRoom.Tests.Application.Fakes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

public class CheckInPatientCommandHandlerTests
{
    private readonly Mock<IEventStore> _eventStoreMock = new();
    private readonly Mock<IEventPublisher> _publisherMock = new();
    private readonly Mock<IPatientIdentityRegistry> _identityRegistryMock = new();
    private readonly FakeClock _clock = new();

    private CheckInPatientCommandHandler CreateHandler() =>
        new(_eventStoreMock.Object, _publisherMock.Object, _clock, null, _identityRegistryMock.Object);

    [Fact]
    public async Task GivenPatientIdentityConflict_WhenHandlingCheckIn_ThenThrowsPatientIdentityConflictException()
    {
        var command = new CheckInPatientCommand
        {
            ServiceId = "QUEUE-01",
            PatientId = "PAT-001",
            PatientName = "John Doe",
            Priority = Priority.High,
            ConsultationType = "General",
            Actor = "reception-1"
        };

        _identityRegistryMock
            .Setup(r => r.EnsureRegisteredAsync(command.PatientId, command.PatientId, command.PatientName, command.Actor, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new PatientIdentityConflictException(command.PatientId, "Existing Name", command.PatientName));

        var handler = CreateHandler();

        await Assert.ThrowsAsync<PatientIdentityConflictException>(() => handler.HandleAsync(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_ValidCommand_SavesAndPublishesEvents()
    {
        var serviceId = "QUEUE-01";
        var command = new CheckInPatientCommand
        {
            ServiceId = serviceId,
            PatientId = "PAT-001",
            PatientName = "John Doe",
            Priority = Priority.High,
            ConsultationType = "General",
            Actor = "nurse-001"
        };

        var queue = WaitingQueue.Create(serviceId, "Main Queue", 10, EventMetadata.CreateNew(serviceId, "system"));
        queue.ClearUncommittedEvents();

        _eventStoreMock.Setup(es => es.LoadAsync<WaitingQueue>(serviceId, It.IsAny<CancellationToken>())).ReturnsAsync(queue);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(command, CancellationToken.None);

        result.Should().BeGreaterThan(0);
        _eventStoreMock.Verify(es => es.SaveAsync(It.IsAny<WaitingQueue>(), It.IsAny<CancellationToken>()), Times.Once);
        _publisherMock.Verify(pub => pub.PublishAsync(It.IsAny<IEnumerable<DomainEvent>>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
