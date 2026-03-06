namespace WaitingRoom.Tests.Integration.Validation;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Data Validation &amp; Edge Case Tests — Nivel: Integracion | Tipo: Funcional
/// Conocimiento: Gray Box (conocimiento parcial de las reglas de validacion del dominio)
///
/// Validan que la API maneja correctamente entradas invalidas, casos limite
/// y condiciones de borde en los datos de entrada.
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): detectan fallos en validacion de entrada.
/// - P2 (Exhaustividad imposible): se seleccionan particiones de equivalencia representativas.
/// - P4 (Agrupacion): la validacion de entrada es un area de alta densidad de defectos.
/// - P5 (Paradoja del pesticida): combinan tecnicas BVA + EP a nivel HTTP.
/// </summary>
[Trait("Category", "Validation")]
[Trait("Level", "Integration")]
[Trait("Type", "Functional")]
[Trait("Knowledge", "GrayBox")]
public sealed class DataValidationTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public DataValidationTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // VAL-001: PatientId — campos vacios
    // ============================================================

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    public async Task VAL001_EmptyPatientId_IsRejected(string emptyId)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = emptyId,
            PatientName = "Validation Test",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            $"PatientId vacio/espacios '{emptyId}' debe ser rechazado");
    }

    // ============================================================
    // VAL-002: PatientName — campos vacios
    // ============================================================

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task VAL002_EmptyPatientName_IsRejected(string emptyName)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-002-PAT",
            PatientName = emptyName,
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "PatientName vacio debe ser rechazado");
    }

    // ============================================================
    // VAL-003: Priority — valores invalidos
    // ============================================================

    [Theory]
    [InlineData("")]
    [InlineData("Invalid")]
    [InlineData("VeryHigh")]
    [InlineData("0")]
    [InlineData("99")]
    public async Task VAL003_InvalidPriority_IsRejected(string invalidPriority)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-003-PAT",
            PatientName = "Priority Test",
            Priority = invalidPriority,
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            $"Prioridad invalida '{invalidPriority}' debe generar error 4xx");
    }

    // ============================================================
    // VAL-004: Priority — valores validos
    // ============================================================

    [Theory]
    [InlineData("Low")]
    [InlineData("Medium")]
    [InlineData("High")]
    [InlineData("Urgent")]
    public async Task VAL004_ValidPriority_IsAccepted(string validPriority)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = $"VAL-004-{validPriority}",
            PatientName = $"Priority {validPriority}",
            Priority = validPriority,
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            $"Prioridad valida '{validPriority}' debe ser aceptada");
    }

    // ============================================================
    // VAL-005: ConsultationType — valores limite
    // ============================================================

    [Theory]
    [InlineData("")]                                    // Vacio
    [InlineData("X")]                                   // Demasiado corto (< 2 chars)
    public async Task VAL005_InvalidConsultationType_IsRejected(string invalidType)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-005-PAT",
            PatientName = "ConsultType Test",
            Priority = "Low",
            ConsultationType = invalidType,
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            $"ConsultationType '{invalidType}' debe ser rechazado");
    }

    // ============================================================
    // VAL-006: QueueId invalido en operaciones de caja
    // ============================================================

    [Theory]
    [InlineData("")]
    [InlineData("nonexistent-queue-id-12345")]
    public async Task VAL006_InvalidQueueId_InCashierOperations_IsRejected(string queueId)
    {
        var dto = new CallNextCashierDto
        {
            QueueId = queueId,
            Actor = "cashier-val"
        };

        var response = await PostWithAuthAsync(
            "/api/cashier/call-next", dto, "Cashier");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            $"QueueId invalido '{queueId}' debe generar error 4xx");
    }

    // ============================================================
    // VAL-007: Actor — campo requerido
    // ============================================================

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task VAL007_EmptyActor_IsRejected(string emptyActor)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-007-PAT",
            PatientName = "Actor Test",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = emptyActor
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            "Actor vacio debe ser rechazado por validacion");
    }

    // ============================================================
    // VAL-008: PatientId — longitud maxima (BVA)
    // ============================================================

    [Fact]
    public async Task VAL008_PatientId_ExceedingMaxLength_IsRejected()
    {
        // PatientId max = 20 chars (valor objeto del dominio)
        var oversizedId = new string('A', 21);
        var dto = new CheckInPatientDto
        {
            PatientId = oversizedId,
            PatientName = "Max Length Test",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            "PatientId con 21 caracteres debe ser rechazado (limite: 20)");
    }

    // ============================================================
    // VAL-009: PatientId — longitud minima aceptada (BVA)
    // ============================================================

    [Fact]
    public async Task VAL009_PatientId_AtMinimumLength_IsAccepted()
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "X",  // longitud minima = 1
            PatientName = "Min Length Test",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "PatientId con 1 caracter debe ser aceptado (limite minimo)");
    }

    // ============================================================
    // VAL-010: Operacion sobre cola inexistente
    // ============================================================

    [Fact]
    public async Task VAL010_OperationOnNonexistentQueue_Returns4xx()
    {
        var dto = new ClaimNextPatientDto
        {
            QueueId = Guid.NewGuid().ToString("D"),
            Actor = "doctor-val",
            StationId = "CONS-01"
        };

        var response = await PostWithAuthAsync(
            "/api/medical/call-next", dto, "Doctor");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            "Operaciones sobre colas inexistentes deben retornar 4xx");
    }

    // ============================================================
    // VAL-011: Caracteres especiales Unicode en campos
    // ============================================================

    [Theory]
    [InlineData("José María García-López")]
    [InlineData("大卫·張")]
    [InlineData("François Müller")]
    [InlineData("Наталья Иванова")]
    public async Task VAL011_UnicodeCharacters_InPatientName_AreHandled(string unicodeName)
    {
        var dto = new CheckInPatientDto
        {
            PatientId = $"VAL-011-{Guid.NewGuid().ToString("N")[..8]}",
            PatientName = unicodeName,
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500,
            $"Caracteres Unicode '{unicodeName}' no deben causar error de servidor");
    }

    // ============================================================
    // VAL-012: Operacion duplicada de paciente en misma cola
    // ============================================================

    [Fact]
    public async Task VAL012_DuplicatePatient_InSameQueue_IsHandledGracefully()
    {
        // Primer check-in
        var dto = new CheckInPatientDto
        {
            PatientId = "VAL-012-DUP",
            PatientName = "Duplicate Test",
            Priority = "Low",
            ConsultationType = "General",
            Actor = "receptionist-val"
        };

        var response1 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        var result1 = await DeserializeAsync(response1);
        var queueId = result1.GetProperty("queueId").GetString()!;

        // Segundo check-in del mismo paciente en la misma cola
        dto = dto with { QueueId = queueId };
        var response2 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");

        var statusCode = (int)response2.StatusCode;
        statusCode.Should().BeOneOf(new[] { 200, 400, 409 },
            "Un paciente duplicado debe ser manejado como duplicado/idempotente o error de dominio");
    }

    // ============================================================
    // Helpers
    // ============================================================

    private async Task<HttpResponseMessage> PostWithAuthAsync<T>(
        string path, T dto, string role)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(dto)
        };
        request.Headers.Add("X-User-Role", role);
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        return await _client.SendAsync(request);
    }

    private static async Task<JsonElement> DeserializeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(body, JsonOpts);
    }
}
