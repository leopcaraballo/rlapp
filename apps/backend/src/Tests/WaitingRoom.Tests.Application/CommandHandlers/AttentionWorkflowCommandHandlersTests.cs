namespace WaitingRoom.Tests.Application.CommandHandlers;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using Moq;
using WaitingRoom.Application.CommandHandlers;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Tests.Application.Fakes;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

public sealed class AttentionWorkflowCommandHandlersTests
{
    [Fact]
    public async Task CallNextCashierAndValidatePayment_ValidFlow_SavesEvents()
    {
        var queue = WaitingQueue.Create("QUEUE-1", "Main", 10, EventMetadata.CreateNew("QUEUE-1", "system"));
        queue.ClearUncommittedEvents();

        queue.CheckInPatient(new CheckInPatientRequest
        {
            PatientId = PatientId.Create("PAT-001"),
            PatientName = "John",
            Priority = Priority.Create(Priority.High),
            ConsultationType = ConsultationType.Create("General"),
            CheckInTime = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew("QUEUE-1", "reception")
        });

        var store = new Mock<IEventStore>();
        var publisher = new Mock<IEventPublisher>();
        var clock = new FakeClock();
        var patientRepo = new Mock<IPatientRepository>();

        store.Setup(x => x.LoadAsync<WaitingQueue>(queue.Id, It.IsAny<CancellationToken>())).ReturnsAsync(queue);

        var callHandler = new CallNextCashierCommandHandler(store.Object, publisher.Object, clock);
        var (eventCount, resultPatientId) = await callHandler.HandleAsync(new CallNextCashierCommand
        {
            ServiceId = queue.Id,
            Actor = "cashier-1"
        });

        resultPatientId.Should().Be("PAT-001");

        // Mock patient for validation
        var patient = Patient.Create("PAT-001", new PatientIdentity("12345678"), "John", null, EventMetadata.CreateNew("PAT-001", "system"));
        patient.MarkAsWaiting(EventMetadata.CreateNew("PAT-001", "system"));
        patient.AssignConsultingRoom("CONS-01", true, EventMetadata.CreateNew("PAT-001", "system"));
        patient.StartConsultation(EventMetadata.CreateNew("PAT-001", "system"));
        patient.FinishConsultation("ok", EventMetadata.CreateNew("PAT-001", "system"));
        patient.ArriveCashier(100m, EventMetadata.CreateNew("PAT-001", "system"));
        patient.ClearUncommittedEvents();
        patientRepo.Setup(x => x.GetByIdAsync("PAT-001", It.IsAny<CancellationToken>())).ReturnsAsync(patient);

        var validateHandler = new ValidatePaymentCommandHandler(patientRepo.Object, store.Object, publisher.Object, clock);
        var validateResponse = await validateHandler.Handle(new ValidatePaymentCommand
        {
            PatientId = "PAT-001",
            ServiceId = queue.Id,
            Actor = "cashier-1"
        }, CancellationToken.None);

        validateResponse.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ClaimNextPatient_ValidQueue_SavesAndPublishesEvents()
    {
        var queue = CreateQueueWithClaimablePatient();
        var store = new Mock<IEventStore>();
        var publisher = new Mock<IEventPublisher>();
        var clock = new FakeClock();

        store.Setup(x => x.LoadAsync<WaitingQueue>(queue.Id, It.IsAny<CancellationToken>())).ReturnsAsync(queue);

        var handler = new ClaimNextPatientCommandHandler(store.Object, publisher.Object, clock);
        var (eventCount, resultPatientId, _) = await handler.HandleAsync(new ClaimNextPatientCommand
        {
            ServiceId = queue.Id,
            Actor = "doctor-1",
            StationId = "S-01"
        });

        resultPatientId.Should().Be("PAT-001");
        store.Verify(x => x.SaveAsync(It.IsAny<WaitingQueue>(), It.IsAny<CancellationToken>()), Times.Once);
        publisher.Verify(x => x.PublishAsync(It.IsAny<IEnumerable<DomainEvent>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    private static WaitingQueue CreateQueueWithClaimablePatient()
    {
        var queue = WaitingQueue.Create("QUEUE-1", "Main", 10, EventMetadata.CreateNew("QUEUE-1", "system"));
        queue.ClearUncommittedEvents();

        queue.CheckInPatient(new CheckInPatientRequest
        {
            PatientId = PatientId.Create("PAT-001"),
            PatientName = "John",
            Priority = Priority.Create(Priority.High),
            ConsultationType = ConsultationType.Create("General"),
            CheckInTime = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew("QUEUE-1", "reception")
        });

        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew("QUEUE-1", "cashier")
        });

        queue.ValidatePayment(new ValidatePaymentRequest
        {
            PatientId = PatientId.Create("PAT-001"),
            ValidatedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew("QUEUE-1", "cashier")
        });

        queue.ActivateConsultingRoom(new ActivateConsultingRoomRequest
        {
            ConsultingRoomId = "S-01",
            ActivatedAt = DateTime.UtcNow,
            Actor = "coordinator",
            Metadata = EventMetadata.CreateNew("QUEUE-1", "coordinator")
        });

        return queue;
    }
}
