namespace WaitingRoom.Tests.Domain.Aggregates;

using BuildingBlocks.EventSourcing;
using FluentAssertions;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.Exceptions;
using WaitingRoom.Domain.Invariants;
using WaitingRoom.Domain.ValueObjects;
using Xunit;

/// <summary>
/// Pruebas de Analisis de Valores Frontera (BVA) para el agregado WaitingQueue.
///
/// Fronteras cubiertas:
/// - Capacidad de cola: 0, 1, max-1, max, max+1
/// - MaxCapacity en creacion: 0, 1, -1
/// - Reintentos de ausencia en taquilla: 0, 1, max(2), max+1
/// - Reintentos de ausencia en consulta: 0, max(1), max+1
/// </summary>
public sealed class WaitingQueueBoundaryValueTests
{
    private const string QueueId = "BVA-Q-01";

    // ============================================================
    // Helpers
    // ============================================================

    private static WaitingQueue CreateQueue(
        string queueId = QueueId,
        string queueName = "BVA Queue",
        int maxCapacity = 10)
    {
        var metadata = EventMetadata.CreateNew(queueId, "system");
        var queue = WaitingQueue.Create(queueId, queueName, maxCapacity, metadata);
        queue.ClearUncommittedEvents();
        return queue;
    }

    private static CheckInPatientRequest CreateCheckIn(
        string patientId = "PAT-001",
        string patientName = "BVA Patient",
        string priority = "Low",
        string consultationType = "General")
    {
        return new CheckInPatientRequest
        {
            PatientId = PatientId.Create(patientId),
            PatientName = patientName,
            Priority = Priority.Create(priority),
            ConsultationType = ConsultationType.Create(consultationType),
            CheckInTime = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "nurse")
        };
    }

    private static void CheckInMultiplePatients(WaitingQueue queue, int count)
    {
        for (var i = 0; i < count; i++)
        {
            queue.CheckInPatient(CreateCheckIn(
                patientId: $"PAT-BVA-{i:D4}",
                patientName: $"Patient BVA {i}"));
            queue.ClearUncommittedEvents();
        }
    }

    /// <summary>
    /// Mueve el siguiente paciente a traves del flujo de taquilla completo:
    /// CallNextAtCashier -> ValidatePayment
    /// </summary>
    private static void MoveNextFromCashierToConsultation(WaitingQueue queue)
    {
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(queue.Id, "cashier-01")
        });

        var activeCashierPatientId = queue.CurrentCashierPatientId!;

        queue.ValidatePayment(new ValidatePaymentRequest
        {
            PatientId = PatientId.Create(activeCashierPatientId),
            ValidatedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(queue.Id, "cashier-01")
        });

        queue.ClearUncommittedEvents();
    }

    // ============================================================
    // BVA — MaxCapacity en creacion
    // ============================================================

    [Fact]
    public void Create_CapacidadCero_LanzaExcepcion()
    {
        // BVA: En el limite inferior prohibido — maxCapacity = 0
        var metadata = EventMetadata.CreateNew("Q-01", "system");
        var act = () => WaitingQueue.Create("Q-01", "Test", 0, metadata);
        act.Should().Throw<DomainException>()
            .WithMessage("*greater than 0*");
    }

    [Fact]
    public void Create_CapacidadNegativa_LanzaExcepcion()
    {
        // BVA: Fuera del limite inferior — maxCapacity = -1
        var metadata = EventMetadata.CreateNew("Q-01", "system");
        var act = () => WaitingQueue.Create("Q-01", "Test", -1, metadata);
        act.Should().Throw<DomainException>()
            .WithMessage("*greater than 0*");
    }

    [Fact]
    public void Create_CapacidadUno_EsValido()
    {
        // BVA: Limite inferior exacto valido — maxCapacity = 1
        var metadata = EventMetadata.CreateNew("Q-01", "system");
        var queue = WaitingQueue.Create("Q-01", "Test", 1, metadata);
        queue.MaxCapacity.Should().Be(1);
    }

    // ============================================================
    // BVA — Capacidad de cola (check-in vs maxCapacity)
    // ============================================================

    [Fact]
    public void CheckIn_ColaVacia_PrimerPaciente_Exitoso()
    {
        // BVA: Limite inferior — 0 pacientes, agregar primero
        var queue = CreateQueue(maxCapacity: 5);
        queue.CurrentCount.Should().Be(0);

        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-FIRST"));

        queue.CurrentCount.Should().Be(1);
    }

    [Fact]
    public void CheckIn_ColaEnMaxMenos1_UltimoPaciente_Exitoso()
    {
        // BVA: Limite superior - 1 — (max-1) pacientes, agregar ultimo permitido
        var queue = CreateQueue(maxCapacity: 3);
        CheckInMultiplePatients(queue, 2); // 2 de 3

        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-LAST"));

        queue.CurrentCount.Should().Be(3);
        queue.IsAtCapacity.Should().BeTrue();
    }

    [Fact]
    public void CheckIn_ColaEnCapacidadMaxima_LanzaExcepcion()
    {
        // BVA: En el limite superior — max pacientes, intentar agregar uno mas
        var queue = CreateQueue(maxCapacity: 3);
        CheckInMultiplePatients(queue, 3); // 3 de 3

        var act = () => queue.CheckInPatient(
            CreateCheckIn(patientId: "PAT-OVERFLOW"));

        act.Should().Throw<DomainException>()
            .WithMessage("*maximum capacity*3*");
    }

    [Fact]
    public void CheckIn_ColaCapacidadUno_SegundoPaciente_LanzaExcepcion()
    {
        // BVA: Cola minima — capacidad 1, intentar segundo paciente
        var queue = CreateQueue(maxCapacity: 1);
        CheckInMultiplePatients(queue, 1);

        var act = () => queue.CheckInPatient(
            CreateCheckIn(patientId: "PAT-SECOND"));

        act.Should().Throw<DomainException>()
            .WithMessage("*maximum capacity*1*");
    }

    [Fact]
    public void AvailableCapacity_ColaVacia_EsIgualAMaxCapacity()
    {
        // BVA: Capacidad disponible = max cuando la cola esta vacia
        var queue = CreateQueue(maxCapacity: 5);
        queue.AvailableCapacity.Should().Be(5);
    }

    [Fact]
    public void AvailableCapacity_ColaLlena_EsCero()
    {
        // BVA: Capacidad disponible = 0 cuando la cola esta llena
        var queue = CreateQueue(maxCapacity: 2);
        CheckInMultiplePatients(queue, 2);
        queue.AvailableCapacity.Should().Be(0);
    }

    // ============================================================
    // BVA — Reintentos de ausencia en taquilla (max = 2)
    // ============================================================

    [Fact]
    public void AusenciaTaquilla_PrimerReintento_PacienteNoCancelado()
    {
        // BVA: Reintento 1 de max(2) — paciente vuelve a espera (no cancelado)
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-ABS-01"));
        queue.ClearUncommittedEvents();

        // Llevar a taquilla
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        // Primera ausencia
        queue.MarkAbsentAtCashier(new MarkAbsentAtCashierRequest
        {
            PatientId = PatientId.Create("PAT-ABS-01"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        // Paciente debe seguir en la cola (no cancelado)
        queue.CurrentCashierPatientId.Should().BeNull();
        queue.Patients.Should().ContainSingle(p => p.PatientId.Value == "PAT-ABS-01");
    }

    [Fact]
    public void AusenciaTaquilla_SegundoReintento_PacienteSigueEnCola()
    {
        // BVA: Reintento 2 de max(2) — paciente sigue en cola (no se cancela automaticamente)
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-ABS-02"));
        queue.ClearUncommittedEvents();

        // Ciclo de ausencia 1
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        queue.MarkAbsentAtCashier(new MarkAbsentAtCashierRequest
        {
            PatientId = PatientId.Create("PAT-ABS-02"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        // Ciclo de ausencia 2
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        queue.MarkAbsentAtCashier(new MarkAbsentAtCashierRequest
        {
            PatientId = PatientId.Create("PAT-ABS-02"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        // Paciente sigue en cola tras agotar reintentos (no se auto-cancela)
        queue.Patients.Should().ContainSingle(p => p.PatientId.Value == "PAT-ABS-02");
    }

    [Fact]
    public void AusenciaTaquilla_TercerIntento_LanzaExcepcion()
    {
        // BVA: Intento 3 — excede MaxCashierAbsenceRetries(2), dominio lanza excepcion
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-ABS-03"));
        queue.ClearUncommittedEvents();

        // Ciclo de ausencia 1
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();
        queue.MarkAbsentAtCashier(new MarkAbsentAtCashierRequest
        {
            PatientId = PatientId.Create("PAT-ABS-03"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        // Ciclo de ausencia 2
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();
        queue.MarkAbsentAtCashier(new MarkAbsentAtCashierRequest
        {
            PatientId = PatientId.Create("PAT-ABS-03"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        // Intento de ausencia 3 — debe lanzar excepcion
        queue.CallNextAtCashier(new CallNextCashierRequest
        {
            CalledAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });
        queue.ClearUncommittedEvents();

        var act = () => queue.MarkAbsentAtCashier(new MarkAbsentAtCashierRequest
        {
            PatientId = PatientId.Create("PAT-ABS-03"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "cashier-01")
        });

        act.Should().Throw<DomainException>()
            .WithMessage("*retries exceeded*");
    }

    // ============================================================
    // BVA — Reintentos de ausencia en consulta (max = 1)
    // ============================================================

    [Fact]
    public void AusenciaConsulta_PrimerReintento_PacienteVuelveAEspera()
    {
        // BVA: Reintento 1 de max(1) — paciente vuelve a espera de consulta
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-CONS-01"));
        queue.ClearUncommittedEvents();

        MoveNextFromCashierToConsultation(queue);

        // Activar consultorio
        queue.ActivateConsultingRoom(new ActivateConsultingRoomRequest
        {
            ConsultingRoomId = "CONS-BVA-01",
            ActivatedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "coordinator")
        });
        queue.ClearUncommittedEvents();

        // Reclamar siguiente paciente
        queue.ClaimNextPatient(new ClaimNextPatientRequest
        {
            ClaimedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "doctor-01"),
            StationId = "CONS-BVA-01"
        });
        queue.ClearUncommittedEvents();

        // Marcar ausencia en consulta (primera — vuelve a espera)
        queue.MarkAbsentAtConsultation(new MarkAbsentAtConsultationRequest
        {
            PatientId = PatientId.Create("PAT-CONS-01"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "doctor-01")
        });
        queue.ClearUncommittedEvents();

        // Paciente debe seguir en la cola (vuelve a espera de consulta)
        queue.Patients.Should().ContainSingle(p => p.PatientId.Value == "PAT-CONS-01");
        queue.CurrentAttentionPatientId.Should().BeNull();
    }

    [Fact]
    public void AusenciaConsulta_SegundoReintento_PacienteCancelado()
    {
        // BVA: Reintento 2 de max(1) — paciente cancelado
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-CONS-02"));
        queue.ClearUncommittedEvents();

        MoveNextFromCashierToConsultation(queue);

        // Activar consultorio
        queue.ActivateConsultingRoom(new ActivateConsultingRoomRequest
        {
            ConsultingRoomId = "CONS-BVA-02",
            ActivatedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "coordinator")
        });
        queue.ClearUncommittedEvents();

        // Primera ausencia
        queue.ClaimNextPatient(new ClaimNextPatientRequest
        {
            ClaimedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "doctor-01"),
            StationId = "CONS-BVA-02"
        });
        queue.ClearUncommittedEvents();

        queue.MarkAbsentAtConsultation(new MarkAbsentAtConsultationRequest
        {
            PatientId = PatientId.Create("PAT-CONS-02"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "doctor-01")
        });
        queue.ClearUncommittedEvents();

        // Segunda ausencia — debe cancelar
        queue.ClaimNextPatient(new ClaimNextPatientRequest
        {
            ClaimedAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "doctor-01"),
            StationId = "CONS-BVA-02"
        });
        queue.ClearUncommittedEvents();

        queue.MarkAbsentAtConsultation(new MarkAbsentAtConsultationRequest
        {
            PatientId = PatientId.Create("PAT-CONS-02"),
            AbsentAt = DateTime.UtcNow,
            Metadata = EventMetadata.CreateNew(QueueId, "doctor-01")
        });
        queue.ClearUncommittedEvents();

        // Paciente cancelado — removido de la lista
        queue.Patients.Should().BeEmpty();
    }

    // ============================================================
    // BVA — Pacientes duplicados (frontera: 0 duplicados OK, 1 duplicado falla)
    // ============================================================

    [Fact]
    public void CheckIn_MismoPacienteDosVeces_LanzaExcepcion()
    {
        // BVA: Frontera de unicidad — segundo check-in del mismo paciente
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-DUP"));
        queue.ClearUncommittedEvents();

        var act = () => queue.CheckInPatient(CreateCheckIn(patientId: "PAT-DUP"));

        act.Should().Throw<DomainException>()
            .WithMessage("*already in the queue*");
    }

    [Fact]
    public void CheckIn_PacientesDiferentes_Exitoso()
    {
        // BVA: 0 duplicados — pacientes distintos no colisionan
        var queue = CreateQueue(maxCapacity: 5);
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-A"));
        queue.ClearUncommittedEvents();
        queue.CheckInPatient(CreateCheckIn(patientId: "PAT-B"));

        queue.CurrentCount.Should().Be(2);
    }
}
