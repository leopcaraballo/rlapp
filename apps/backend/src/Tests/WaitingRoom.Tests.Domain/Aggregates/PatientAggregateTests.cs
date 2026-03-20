namespace WaitingRoom.Tests.Domain.Aggregates;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Events;
using WaitingRoom.Domain.Exceptions;
using WaitingRoom.Domain.ValueObjects;
using Xunit;

public class PatientAggregateTests
{
    [Fact]
    public void Create_WithValidData_EmitsPatientRegisteredAndSetsRegisteredState()
    {
        var patientId = "PAT-001";
        var metadata = EventMetadata.CreateNew(patientId, "test");

        var patient = Patient.Create(patientId, new PatientIdentity("12345678"), "John Doe", null, metadata);

        patient.CurrentState.Should().Be(PatientState.Registered);
        patient.HasUncommittedEvents.Should().BeTrue();
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientRegistered>();
    }

    [Fact]
    public void Create_WithEmptyOrWhitespaceName_ThrowsDomainException()
    {
        var patientId = "PAT-001";
        var metadata = EventMetadata.CreateNew(patientId, "test");

        Action act = () => Patient.Create(patientId, new PatientIdentity("12345678"), "   ", null, metadata);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void MarkAsWaiting_FromRegistered_SetsWaitingAndEmitsPatientMarkedAsWaiting()
    {
        var patient = CreatePatient();
        var metadata = EventMetadata.CreateNew(patient.Id, "test");

        patient.MarkAsWaiting(metadata);

        patient.CurrentState.Should().Be(PatientState.Waiting);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientMarkedAsWaiting>();
    }

    [Fact]
    public void MarkAsWaiting_WhenAlreadyWaiting_ThrowsDomainException()
    {
        var patient = CreatePatient();
        var metadata = EventMetadata.CreateNew(patient.Id, "test");
        patient.MarkAsWaiting(metadata);
        patient.ClearUncommittedEvents();

        Action act = () => patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AssignConsultingRoom_FromWaitingWithActiveRoom_SetsAssignedAndEmitsPatientConsultingRoomAssigned()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));

        patient.CurrentState.Should().Be(PatientState.Assigned);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientConsultingRoomAssigned>();
    }

    [Fact]
    public void AssignConsultingRoom_WhenRoomIsNotActive_ThrowsDomainException()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        Action act = () => patient.AssignConsultingRoom("ROOM-001", false, EventMetadata.CreateNew(patient.Id, "test"));

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AssignConsultingRoom_WithEmptyConsultingRoomId_ThrowsDomainException()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        Action act = () => patient.AssignConsultingRoom("   ", true, EventMetadata.CreateNew(patient.Id, "test"));

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void StartConsultation_FromAssigned_SetsInConsultationAndEmitsPatientConsultationStarted()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        patient.StartConsultation(EventMetadata.CreateNew(patient.Id, "test"));

        patient.CurrentState.Should().Be(PatientState.InConsultation);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientConsultationStarted>();
    }

    [Fact]
    public void FinishConsultation_FromInConsultation_SetsFinishedConsultationAndEmitsPatientConsultationFinished()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));
        patient.StartConsultation(EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        patient.FinishConsultation("all good", EventMetadata.CreateNew(patient.Id, "test"));

        patient.CurrentState.Should().Be(PatientState.FinishedConsultation);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientConsultationFinished>();
    }

    [Fact]
    public void ArriveCashier_FromFinishedConsultation_SetsAtCashierAndEmitsPatientArrivedAtCashier()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));
        patient.StartConsultation(EventMetadata.CreateNew(patient.Id, "test"));
        patient.FinishConsultation("notes", EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        patient.ArriveCashier(150m, EventMetadata.CreateNew(patient.Id, "test"));

        patient.CurrentState.Should().Be(PatientState.AtCashier);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientArrivedAtCashier>();
    }

    [Fact]
    public void ValidatePayment_FromAtCashier_SetsPaymentValidatedAndEmitsPatientPaymentValidated()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));
        patient.StartConsultation(EventMetadata.CreateNew(patient.Id, "test"));
        patient.FinishConsultation("notes", EventMetadata.CreateNew(patient.Id, "test"));
        patient.ArriveCashier(150m, EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        patient.ValidatePayment(EventMetadata.CreateNew(patient.Id, "test"));

        patient.CurrentState.Should().Be(PatientState.PaymentValidated);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientPaymentValidated>();
    }

    [Fact]
    public void Complete_FromPaymentValidated_SetsCompletedAndEmitsPatientCompleted()
    {
        var patient = CreatePatient();
        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));
        patient.StartConsultation(EventMetadata.CreateNew(patient.Id, "test"));
        patient.FinishConsultation("notes", EventMetadata.CreateNew(patient.Id, "test"));
        patient.ArriveCashier(150m, EventMetadata.CreateNew(patient.Id, "test"));
        patient.ValidatePayment(EventMetadata.CreateNew(patient.Id, "test"));
        patient.ClearUncommittedEvents();

        patient.Complete(EventMetadata.CreateNew(patient.Id, "test"));

        patient.CurrentState.Should().Be(PatientState.Completed);
        patient.UncommittedEvents.Should().HaveCount(1);
        patient.UncommittedEvents[0].Should().BeOfType<PatientCompleted>();
    }

    [Fact]
    public void FullHappyPathFlow_TransitionsThroughAllExpectedStates()
    {
        var patient = CreatePatient();

        patient.MarkAsWaiting(EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.Waiting);

        patient.AssignConsultingRoom("ROOM-001", true, EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.Assigned);

        patient.StartConsultation(EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.InConsultation);

        patient.FinishConsultation("notes", EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.FinishedConsultation);

        patient.ArriveCashier(250m, EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.AtCashier);

        patient.ValidatePayment(EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.PaymentValidated);

        patient.Complete(EventMetadata.CreateNew(patient.Id, "test"));
        patient.CurrentState.Should().Be(PatientState.Completed);
    }

    private static Patient CreatePatient(
        string patientId = "PAT-001",
        string identity = "12345678",
        string name = "John Doe",
        string? phone = null)
    {
        var metadata = EventMetadata.CreateNew(patientId, "system");
        var patient = Patient.Create(patientId, new PatientIdentity(identity), name, phone, metadata);
        patient.ClearUncommittedEvents();
        return patient;
    }
}
