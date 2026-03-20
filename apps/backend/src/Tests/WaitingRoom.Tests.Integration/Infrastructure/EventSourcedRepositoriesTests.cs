namespace WaitingRoom.Tests.Integration.Infrastructure;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using Moq;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Infrastructure.Persistence.Repositories;
using Xunit;

public sealed class EventSourcedRepositoriesTests
{
    [Fact]
    public async Task PatientRepository_GetById_DelegatesToEventStoreLoad()
    {
        var eventStore = new Mock<IEventStore>();
        var identityRegistry = new Mock<IPatientIdentityRegistry>();

        var patient = Patient.Create(
            patientId: "PAT-LOAD-001",
            identity: new PatientIdentity("10020030"),
            patientName: "Load Patient",
            phoneNumber: null,
            metadata: EventMetadata.CreateNew("PAT-LOAD-001", "test"));

        eventStore
            .Setup(x => x.LoadAsync<Patient>("PAT-LOAD-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patient);

        var repository = new PatientRepository(eventStore.Object, identityRegistry.Object);

        var result = await repository.GetByIdAsync("PAT-LOAD-001", CancellationToken.None);

        result.Should().BeSameAs(patient);
        eventStore.Verify(x => x.LoadAsync<Patient>("PAT-LOAD-001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PatientRepository_GetByIdentity_WhenRegistryReturnsNull_ReturnsNullWithoutLoadingAggregate()
    {
        var eventStore = new Mock<IEventStore>();
        var identityRegistry = new Mock<IPatientIdentityRegistry>();

        identityRegistry
            .Setup(x => x.GetPatientIdByIdentityAsync("ID-NOT-FOUND", It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        var repository = new PatientRepository(eventStore.Object, identityRegistry.Object);

        var result = await repository.GetByIdentityAsync("ID-NOT-FOUND", CancellationToken.None);

        result.Should().BeNull();
        eventStore.Verify(x => x.LoadAsync<Patient>(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PatientRepository_GetByIdentity_WhenRegistryReturnsPatientId_LoadsAggregate()
    {
        var eventStore = new Mock<IEventStore>();
        var identityRegistry = new Mock<IPatientIdentityRegistry>();

        var patient = Patient.Create(
            patientId: "PAT-FROM-IDENTITY-001",
            identity: new PatientIdentity("55667788"),
            patientName: "Identity Patient",
            phoneNumber: "555-1122",
            metadata: EventMetadata.CreateNew("PAT-FROM-IDENTITY-001", "test"));

        identityRegistry
            .Setup(x => x.GetPatientIdByIdentityAsync("55667788", It.IsAny<CancellationToken>()))
            .ReturnsAsync("PAT-FROM-IDENTITY-001");

        eventStore
            .Setup(x => x.LoadAsync<Patient>("PAT-FROM-IDENTITY-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patient);

        var repository = new PatientRepository(eventStore.Object, identityRegistry.Object);

        var result = await repository.GetByIdentityAsync("55667788", CancellationToken.None);

        result.Should().BeSameAs(patient);
        eventStore.Verify(x => x.LoadAsync<Patient>("PAT-FROM-IDENTITY-001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PatientRepository_Save_DelegatesToEventStoreSave()
    {
        var eventStore = new Mock<IEventStore>();
        var identityRegistry = new Mock<IPatientIdentityRegistry>();

        var patient = Patient.Create(
            patientId: "PAT-SAVE-001",
            identity: new PatientIdentity("44332211"),
            patientName: "Save Patient",
            phoneNumber: null,
            metadata: EventMetadata.CreateNew("PAT-SAVE-001", "test"));

        var repository = new PatientRepository(eventStore.Object, identityRegistry.Object);

        await repository.SaveAsync(patient, CancellationToken.None);

        eventStore.Verify(x => x.SaveAsync(patient, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ConsultingRoomRepository_GetById_DelegatesToEventStoreLoad()
    {
        var eventStore = new Mock<IEventStore>();

        var room = ConsultingRoom.Create(
            roomId: "ROOM-001",
            roomName: "Consulting Room 1",
            metadata: EventMetadata.CreateNew("ROOM-001", "admin"));

        eventStore
            .Setup(x => x.LoadAsync<ConsultingRoom>("ROOM-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(room);

        var repository = new ConsultingRoomRepository(eventStore.Object);

        var result = await repository.GetByIdAsync("ROOM-001", CancellationToken.None);

        result.Should().BeSameAs(room);
        eventStore.Verify(x => x.LoadAsync<ConsultingRoom>("ROOM-001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ConsultingRoomRepository_Save_DelegatesToEventStoreSave()
    {
        var eventStore = new Mock<IEventStore>();

        var room = ConsultingRoom.Create(
            roomId: "ROOM-002",
            roomName: "Consulting Room 2",
            metadata: EventMetadata.CreateNew("ROOM-002", "admin"));

        var repository = new ConsultingRoomRepository(eventStore.Object);

        await repository.SaveAsync(room, CancellationToken.None);

        eventStore.Verify(x => x.SaveAsync(room, It.IsAny<CancellationToken>()), Times.Once);
    }
}