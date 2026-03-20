namespace WaitingRoom.Tests.Application.CommandHandlers;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using Moq;
using WaitingRoom.Application.CommandHandlers;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.ValueObjects;

public sealed class PatientCommandHandlersTests
{
    [Fact]
    public async Task GivenExistingPatientByIdentity_WhenRegistering_ThenReturnsExistingPatientIdWithoutSaving()
    {
        var patientRepository = new Mock<IPatientRepository>();
        var identityRegistry = new Mock<IPatientIdentityRegistry>();

        var existingPatient = Patient.Create(
            patientId: "PAT-EXISTING-001",
            identity: new PatientIdentity("12345678"),
            patientName: "John Existing",
            phoneNumber: "555-0101",
            metadata: EventMetadata.CreateNew("PAT-EXISTING-001", "System"));

        patientRepository
            .Setup(x => x.GetByIdentityAsync("12345678", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPatient);

        var handler = new RegisterPatientCommandHandler(patientRepository.Object, identityRegistry.Object);

        var command = new RegisterPatientCommand
        {
            PatientIdentity = "12345678",
            PatientName = "John Existing",
            PhoneNumber = "555-0101"
        };

        var response = await handler.Handle(command, CancellationToken.None);

        response.PatientId.Should().Be(existingPatient.Id);
        response.Message.Should().Be("Patient already registered");

        patientRepository.Verify(x => x.SaveAsync(It.IsAny<Patient>(), It.IsAny<CancellationToken>()), Times.Never);
        identityRegistry.Verify(x => x.EnsureRegisteredAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GivenNewPatient_WhenRegistering_ThenEnsuresIdentityAndSavesAggregate()
    {
        var patientRepository = new Mock<IPatientRepository>();
        var identityRegistry = new Mock<IPatientIdentityRegistry>();

        patientRepository
            .Setup(x => x.GetByIdentityAsync("87654321", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Patient?)null);

        var handler = new RegisterPatientCommandHandler(patientRepository.Object, identityRegistry.Object);

        var command = new RegisterPatientCommand
        {
            PatientIdentity = "87654321",
            PatientName = "Jane New",
            PhoneNumber = "555-0202"
        };

        var response = await handler.Handle(command, CancellationToken.None);

        response.Message.Should().Be("Patient registered successfully");
        response.PatientId.Should().NotBeNullOrWhiteSpace();

        identityRegistry.Verify(x => x.EnsureRegisteredAsync(
            It.Is<string>(patientId => patientId == response.PatientId),
            It.Is<string>(identity => identity == command.PatientIdentity),
            It.Is<string>(name => name == command.PatientName),
            It.Is<string>(actor => actor == "System"),
            It.IsAny<CancellationToken>()), Times.Once);

        patientRepository.Verify(x => x.SaveAsync(
            It.Is<Patient>(patient =>
                patient.Id == response.PatientId &&
                patient.Identity.Value == command.PatientIdentity &&
                patient.PatientName == command.PatientName),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GivenPatientNotFound_WhenMarkingAsWaiting_ThenReturnsFailure()
    {
        var patientRepository = new Mock<IPatientRepository>();
        patientRepository
            .Setup(x => x.GetByIdAsync("PAT-MISSING-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Patient?)null);

        var handler = new MarkPatientAsWaitingCommandHandler(patientRepository.Object);

        var command = new MarkPatientAsWaitingCommand
        {
            PatientId = "PAT-MISSING-001",
            Actor = "reception-1"
        };

        var response = await handler.Handle(command, CancellationToken.None);

        response.Success.Should().BeFalse();
        patientRepository.Verify(x => x.SaveAsync(It.IsAny<Patient>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GivenRegisteredPatient_WhenMarkingAsWaiting_ThenTransitionsAndSaves()
    {
        var patientRepository = new Mock<IPatientRepository>();

        var patient = Patient.Create(
            patientId: "PAT-REGISTERED-001",
            identity: new PatientIdentity("99900111"),
            patientName: "Patient Registered",
            phoneNumber: null,
            metadata: EventMetadata.CreateNew("PAT-REGISTERED-001", "System"));
        patient.ClearUncommittedEvents();

        patientRepository
            .Setup(x => x.GetByIdAsync("PAT-REGISTERED-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patient);

        var handler = new MarkPatientAsWaitingCommandHandler(patientRepository.Object);

        var command = new MarkPatientAsWaitingCommand
        {
            PatientId = "PAT-REGISTERED-001",
            Actor = "reception-1"
        };

        var response = await handler.Handle(command, CancellationToken.None);

        response.Success.Should().BeTrue();
        patient.CurrentState.Should().Be(PatientState.Waiting);
        patientRepository.Verify(x => x.SaveAsync(It.Is<Patient>(p => ReferenceEquals(p, patient)), It.IsAny<CancellationToken>()), Times.Once);
    }
}