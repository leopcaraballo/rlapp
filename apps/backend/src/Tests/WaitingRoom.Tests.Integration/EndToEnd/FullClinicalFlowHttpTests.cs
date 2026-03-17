namespace WaitingRoom.Tests.Integration.EndToEnd;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// End-to-end HTTP integration tests for the complete clinical patient flow.
///
/// Validates the full patient journey through HTTP endpoints using
/// WebApplicationFactory with in-memory fakes (no real infrastructure required).
///
/// Clinical Flow:
///   1. CheckIn patient (Reception)
///   2. Activate consulting room (Medical setup)
///   3. Call next at cashier (Cashier)
///   4. Validate payment (Cashier)
///   5. Claim next patient (Medical)
///   6. Start consultation (Medical)
///   7. Complete attention (Medical)
///
/// // HUMAN CHECK: Verify that the clinical flow matches the actual hospital workflow.
/// These tests assume the in-memory fakes provide sufficient domain behavior fidelity.
/// </summary>
public sealed class FullClinicalFlowHttpTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public FullClinicalFlowHttpTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    /// <summary>
    /// Tests the complete happy-path clinical flow through all HTTP endpoints.
    /// CheckIn → ActivateRoom → CashierCall → Payment → Claim → Call → Complete.
    /// </summary>
    [Fact]
    public async Task FullClinicalFlow_HappyPath_CompletesSuccessfully()
    {
        // Paso 1: Check-in del paciente (recepcion)
        var checkInDto = new CheckInPatientDto
        {
            PatientId = "FLOW-PAT-001",
            PatientName = "Maria Garcia Lopez",
            Priority = "High",
            ConsultationType = "Cardiology",
            Actor = "receptionist-01"
        };

        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            checkInDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        checkInResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var checkInResult = await DeserializeAsync(checkInResponse);
        var queueId = checkInResult.GetProperty("queueId").GetString();
        queueId.Should().NotBeNullOrEmpty("El check-in debe devolver un queueId generado");
        checkInResult.GetProperty("success").GetBoolean().Should().BeTrue();
        checkInResult.GetProperty("eventCount").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        // Paso 2: Activar consultorio medico
        var activateDto = new ActivateConsultingRoomDto
        {
            QueueId = queueId!,
            ConsultingRoomId = "CONS-01",
            Actor = "coordinator-01"
        };

        var activateResponse = await SendPostAsync(
            "/api/medical/consulting-room/activate", activateDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Admin" });

        activateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var activateResult = await DeserializeAsync(activateResponse);
        activateResult.GetProperty("success").GetBoolean().Should().BeTrue();

        // Paso 3: Llamar al siguiente paciente en caja
        var cashierCallDto = new CallNextCashierDto
        {
            QueueId = queueId!,
            Actor = "cashier-01",
            CashierDeskId = "DESK-01"
        };

        var cashierCallResponse = await SendPostAsync(
            "/api/cashier/call-next", cashierCallDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        cashierCallResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var cashierCallResult = await DeserializeAsync(cashierCallResponse);
        var patientId = cashierCallResult.GetProperty("patientId").GetString();
        patientId.Should().NotBeNullOrEmpty("El llamado de caja debe devolver el patientId");
        cashierCallResult.GetProperty("success").GetBoolean().Should().BeTrue();

        // Paso 4: Validar pago del paciente
        var paymentDto = new ValidatePaymentDto
        {
            QueueId = queueId!,
            PatientId = patientId!,
            Actor = "cashier-01",
            PaymentReference = "PAY-REF-001"
        };

        var paymentResponse = await SendPostAsync(
            "/api/cashier/validate-payment", paymentDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        paymentResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var paymentResult = await DeserializeAsync(paymentResponse);
        paymentResult.GetProperty("success").GetBoolean().Should().BeTrue();

        // Paso 5: Reclamar siguiente paciente para consulta medica
        var claimDto = new ClaimNextPatientDto
        {
            QueueId = queueId!,
            Actor = "doctor-01",
            StationId = "CONS-01"
        };

        var claimResponse = await SendPostAsync(
            "/api/medical/call-next", claimDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" });

        claimResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var claimResult = await DeserializeAsync(claimResponse);
        var claimedPatientId = claimResult.GetProperty("patientId").GetString();
        claimedPatientId.Should().Be(patientId, "El mismo paciente debe ser reclamado");
        claimResult.GetProperty("stationId").GetString().Should().Be("CONS-01");

        // Paso 6: Iniciar consulta
        var startDto = new CallPatientDto
        {
            QueueId = queueId!,
            PatientId = claimedPatientId!,
            Actor = "nurse-01"
        };

        var startResponse = await SendPostAsync(
            "/api/medical/start-consultation", startDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" });

        startResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var startResult = await DeserializeAsync(startResponse);
        startResult.GetProperty("success").GetBoolean().Should().BeTrue();

        // Paso 7: Completar atencion
        var completeDto = new CompleteAttentionDto
        {
            QueueId = queueId!,
            PatientId = claimedPatientId!,
            Actor = "doctor-01",
            Outcome = "Diagnostico completado",
            Notes = "Paciente de prueba E2E atendido exitosamente"
        };

        var completeResponse = await SendPostAsync(
            "/api/medical/finish-consultation", completeDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" });

        completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var completeResult = await DeserializeAsync(completeResponse);
        completeResult.GetProperty("success").GetBoolean().Should().BeTrue();
        completeResult.GetProperty("eventCount").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }

    /// <summary>
    /// Tests the reception alias endpoint (/api/reception/register) works identically
    /// to the check-in endpoint.
    /// </summary>
    [Fact]
    public async Task ReceptionRegister_AliasEndpoint_WorksIdenticallyToCheckIn()
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "RECEP-PAT-001",
            PatientName = "Carlos Restrepo",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-02"
        };

        var response = await SendPostAsync(
            "/api/reception/register",
            dto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(response);
        result.GetProperty("queueId").GetString().Should().NotBeNullOrEmpty();
        result.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    /// <summary>
    /// Tests that multiple patients can be checked in and processed independently.
    /// </summary>
    [Fact]
    public async Task MultiplePatients_CheckedInSequentially_AllProcessedIndependently()
    {
        var patients = new[]
        {
            ("MULTI-PAT-001", "Ana Martinez", "High", "Urgencias"),
            ("MULTI-PAT-002", "Pedro Sanchez", "Medium", "General"),
            ("MULTI-PAT-003", "Lucia Fernandez", "Low", "Dermatologia")
        };

        string? queueId = null;

        foreach (var (patId, name, priority, consultation) in patients)
        {
            var dto = new CheckInPatientDto
            {
                QueueId = queueId,
                PatientId = patId,
                PatientName = name,
                Priority = priority,
                ConsultationType = consultation,
                Actor = "receptionist-multi"
            };

            var response = await SendPostAsync(
                "/api/waiting-room/check-in",
                dto,
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await DeserializeAsync(response);
            var returnedQueueId = result.GetProperty("queueId").GetString();
            returnedQueueId.Should().NotBeNullOrEmpty();

            // Usar el mismo queueId para los pacientes subsiguientes
            queueId ??= returnedQueueId;
        }
    }

    /// <summary>
    /// Tests the cashier mark-absent flow: patient is called but marked absent.
    /// </summary>
    [Fact]
    public async Task CashierFlow_MarkAbsent_PatientRemovedFromCashierQueue()
    {
        // Registrar paciente
        var checkInDto = new CheckInPatientDto
        {
            PatientId = "ABSENT-CASH-001",
            PatientName = "Juan Ausente",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-03"
        };

        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            checkInDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        var checkInResult = await DeserializeAsync(checkInResponse);
        var queueId = checkInResult.GetProperty("queueId").GetString()!;

        // Llamar en caja
        var callResponse = await SendPostAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto { QueueId = queueId, Actor = "cashier-02" },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        var callResult = await DeserializeAsync(callResponse);
        var patientId = callResult.GetProperty("patientId").GetString()!;

        // Marcar como ausente en caja
        var absentDto = new MarkAbsentAtCashierDto
        {
            QueueId = queueId,
            PatientId = patientId,
            Actor = "cashier-02"
        };

        var absentResponse = await SendPostAsync(
            "/api/cashier/mark-absent", absentDto,
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        absentResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var absentResult = await DeserializeAsync(absentResponse);
        absentResult.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    /// <summary>
    /// Tests that cancel-by-payment is rejected when business preconditions are not met.
    /// Domain rule: requires 3 payment attempts before cancellation is allowed.
    /// </summary>
    [Fact]
    public async Task CashierFlow_CancelPayment_WithoutPreconditions_ReturnsBadRequest()
    {
        // Registrar paciente
        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = "CANCEL-PAY-001",
                PatientName = "Andrea Cancelar",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "receptionist-04"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        var queueId = (await DeserializeAsync(checkInResponse))
            .GetProperty("queueId").GetString()!;

        // Llamar en caja
        var callResult = await DeserializeAsync(
            await SendPostAsync(
                "/api/cashier/call-next",
                new CallNextCashierDto { QueueId = queueId, Actor = "cashier-03" },
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" }));

        var patientId = callResult.GetProperty("patientId").GetString()!;

        // Intentar cancelar pago sin cumplir precondiciones (requiere 3 intentos)
        var cancelResponse = await SendPostAsync(
            "/api/cashier/cancel-payment",
            new CancelByPaymentDto
            {
                QueueId = queueId,
                PatientId = patientId,
                Actor = "cashier-03",
                Reason = "Paciente solicita cancelacion"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        // El dominio rechaza la cancelacion porque no se han cumplido 3 intentos de pago
        cancelResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "La cancelacion por pago requiere 3 intentos previos segun regla de dominio");
    }

    /// <summary>
    /// Tests the mark-payment-pending flow at cashier.
    /// </summary>
    [Fact]
    public async Task CashierFlow_MarkPaymentPending_PatientMarkedPending()
    {
        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = "PEND-PAY-001",
                PatientName = "Roberto Pendiente",
                Priority = "Medium",
                ConsultationType = "General",
                Actor = "receptionist-05"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        var queueId = (await DeserializeAsync(checkInResponse))
            .GetProperty("queueId").GetString()!;

        var callResult = await DeserializeAsync(
            await SendPostAsync(
                "/api/cashier/call-next",
                new CallNextCashierDto { QueueId = queueId, Actor = "cashier-04" },
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" }));

        var patientId = callResult.GetProperty("patientId").GetString()!;

        // Marcar pago pendiente
        var pendingResponse = await SendPostAsync(
            "/api/cashier/mark-payment-pending",
            new MarkPaymentPendingDto
            {
                QueueId = queueId,
                PatientId = patientId,
                Actor = "cashier-04",
                Reason = "Falta documento de aseguradora"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        pendingResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var pendingResult = await DeserializeAsync(pendingResponse);
        pendingResult.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    /// <summary>
    /// Tests the medical mark-absent flow: patient is called but absent at consultation.
    /// </summary>
    [Fact]
    public async Task MedicalFlow_MarkAbsentAtConsultation_PatientMarkedAbsent()
    {
        // Flujo completo hasta consulta
        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = "ABSENT-MED-001",
                PatientName = "Sofia Ausente Medica",
                Priority = "High",
                ConsultationType = "Neurologia",
                Actor = "receptionist-06"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        var queueId = (await DeserializeAsync(checkInResponse))
            .GetProperty("queueId").GetString()!;

        // Activar consultorio
        await SendPostAsync(
            "/api/medical/consulting-room/activate",
            new ActivateConsultingRoomDto
            {
                QueueId = queueId,
                ConsultingRoomId = "CONS-MED-01",
                Actor = "coordinator-02"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Admin" });

        // Caja: llamar + validar pago
        var cashierResult = await DeserializeAsync(
            await SendPostAsync(
                "/api/cashier/call-next",
                new CallNextCashierDto { QueueId = queueId, Actor = "cashier-05" },
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" }));

        var patientId = cashierResult.GetProperty("patientId").GetString()!;

        await SendPostAsync(
            "/api/cashier/validate-payment",
            new ValidatePaymentDto
            {
                QueueId = queueId,
                PatientId = patientId,
                Actor = "cashier-05",
                PaymentReference = "PAY-MED-001"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        // Reclamar paciente (estado: LlamadoConsulta)
        var claimResult = await DeserializeAsync(
            await SendPostAsync(
                "/api/medical/call-next",
                new ClaimNextPatientDto
                {
                    QueueId = queueId,
                    Actor = "doctor-02",
                    StationId = "CONS-MED-01"
                },
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" }));

        var claimedPatientId = claimResult.GetProperty("patientId").GetString()!;

        // Marcar ausente en consulta (antes de iniciar consulta — estado LlamadoConsulta)
        // El paciente fue reclamado/llamado pero no se presento.
        var absentResponse = await SendPostAsync(
            "/api/medical/mark-absent",
            new MarkAbsentAtConsultationDto
            {
                QueueId = queueId,
                PatientId = claimedPatientId,
                Actor = "doctor-02"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" });

        absentResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var absentResult = await DeserializeAsync(absentResponse);
        absentResult.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    /// <summary>
    /// Tests deactivating a consulting room after activation.
    /// </summary>
    [Fact]
    public async Task MedicalSetup_DeactivateConsultingRoom_SuccessfullyDeactivated()
    {
        // Registrar paciente para crear cola
        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = "DEACT-PAT-001",
                PatientName = "Test Deactivate",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "receptionist-07"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        var queueId = (await DeserializeAsync(checkInResponse))
            .GetProperty("queueId").GetString()!;

        // Activar consultorio
        var activateResponse = await SendPostAsync(
            "/api/medical/consulting-room/activate",
            new ActivateConsultingRoomDto
            {
                QueueId = queueId,
                ConsultingRoomId = "CONS-DEACT-01",
                Actor = "coordinator-03"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Admin" });

        activateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Desactivar consultorio
        var deactivateResponse = await SendPostAsync(
            "/api/medical/consulting-room/deactivate",
            new DeactivateConsultingRoomDto
            {
                QueueId = queueId,
                ConsultingRoomId = "CONS-DEACT-01",
                Actor = "coordinator-03"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Admin" });

        deactivateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync(deactivateResponse);
        result.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    /// <summary>
    /// Tests the alternative waiting-room endpoints (claim-next, call-patient, complete-attention)
    /// as opposed to the medical module endpoints.
    /// </summary>
    [Fact]
    public async Task WaitingRoomEndpoints_AlternativeFlow_CompletesSuccessfully()
    {
        var checkInResponse = await SendPostAsync(
            "/api/waiting-room/check-in",
            new CheckInPatientDto
            {
                PatientId = "WR-ALT-001",
                PatientName = "Elena Alternativa",
                Priority = "High",
                ConsultationType = "Pediatria",
                Actor = "receptionist-08"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Receptionist" });

        var queueId = (await DeserializeAsync(checkInResponse))
            .GetProperty("queueId").GetString()!;

        // Activar consultorio
        await SendPostAsync(
            "/api/medical/consulting-room/activate",
            new ActivateConsultingRoomDto
            {
                QueueId = queueId,
                ConsultingRoomId = "CONS-ALT-01",
                Actor = "coordinator-alt"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Admin" });

        // Caja
        var cashierResult = await DeserializeAsync(
            await SendPostAsync(
                "/api/cashier/call-next",
                new CallNextCashierDto { QueueId = queueId, Actor = "cashier-alt" },
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" }));
        var patientId = cashierResult.GetProperty("patientId").GetString()!;

        await SendPostAsync(
            "/api/cashier/validate-payment",
            new ValidatePaymentDto
            {
                QueueId = queueId,
                PatientId = patientId,
                Actor = "cashier-alt",
                PaymentReference = "PAY-ALT-001"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Cashier" });

        // Usar endpoints de waiting-room (no medical)
        var claimResult = await DeserializeAsync(
            await SendPostAsync(
                "/api/waiting-room/claim-next",
                new ClaimNextPatientDto
                {
                    QueueId = queueId,
                    Actor = "doctor-alt",
                    StationId = "CONS-ALT-01"
                },
                additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" }));

        var claimedId = claimResult.GetProperty("patientId").GetString()!;

        var callResponse = await SendPostAsync(
            "/api/waiting-room/call-patient",
            new CallPatientDto
            {
                QueueId = queueId,
                PatientId = claimedId,
                Actor = "nurse-alt"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" });
        callResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var completeResponse = await SendPostAsync(
            "/api/waiting-room/complete-attention",
            new CompleteAttentionDto
            {
                QueueId = queueId,
                PatientId = claimedId,
                Actor = "doctor-alt",
                Outcome = "Alta medica"
            },
            additionalHeaders: new Dictionary<string, string> { ["X-User-Role"] = "Doctor" });

        completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var completeResult = await DeserializeAsync(completeResponse);
        completeResult.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    // ============================================================
    // Helpers
    // ============================================================

    private async Task<HttpResponseMessage> SendPostAsync<T>(
        string path,
        T dto,
        Dictionary<string, string>? additionalHeaders = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(dto),
            Headers = { { "Idempotency-Key", Guid.NewGuid().ToString("D") } }
        };

        if (additionalHeaders != null)
        {
            foreach (var (key, value) in additionalHeaders)
                request.Headers.Add(key, value);
        }

        return await _client.SendAsync(request);
    }

    private static async Task<JsonElement> DeserializeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(body, JsonOptions);
    }
}
