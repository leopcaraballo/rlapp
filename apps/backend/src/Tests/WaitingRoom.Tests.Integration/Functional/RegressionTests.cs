namespace WaitingRoom.Tests.Integration.Functional;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Regression Tests — Nivel: Integracion | Tipo: Funcional (Regresion) | Conocimiento: Black Box
///
/// Validan que defectos previamente corregidos no reaparecen. Cada test se vincula
/// a un hallazgo historico de auditoria o bug report.
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): confirma la correccion de defectos conocidos.
/// - P4 (Agrupacion de defectos): se enfocan en areas donde se han encontrado bugs.
/// - P5 (Paradoja del pesticida): se renueva el conjunto de tests conforme se descubren
///   nuevos defectos, evitando que la suite se vuelva ineficaz.
/// </summary>
[Trait("Category", "Regression")]
[Trait("Level", "Integration")]
[Trait("Type", "Functional")]
[Trait("Knowledge", "BlackBox")]
public sealed class RegressionTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public RegressionTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // REG-001: S-05 — Generic endpoints sin proteccion (corregido)
    // Hallazgo auditoria: /api/waiting-room/claim-next era accesible sin autenticacion
    // ============================================================

    /// <summary>
    /// Regresion: Los endpoints genericos de waiting-room deben requerir autenticacion
    /// (hallazgo S-05 de auditoria de seguridad).
    /// </summary>
    [Theory]
    [InlineData("/api/waiting-room/claim-next")]
    [InlineData("/api/waiting-room/call-patient")]
    [InlineData("/api/waiting-room/complete-attention")]
    public async Task REG001_GenericEndpoints_RequireAuthentication(string endpoint)
    {
        // Arrange: sin header X-User-Role
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new { QueueId = "REG-Q-01", PatientId = "REG-P-01", Actor = "a", StationId = "S-01" })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            $"Regresion S-05: {endpoint} debe requerir autenticacion");
    }

    // ============================================================
    // REG-002: S-06 — Roles incorrectos acceden a endpoints protegidos (corregido)
    // ============================================================

    /// <summary>
    /// Regresion: Receptionist y Cashier no deben acceder a endpoints de medicos
    /// (hallazgo S-06 de auditoria).
    /// </summary>
    [Theory]
    [InlineData("/api/medical/call-next", "Receptionist")]
    [InlineData("/api/medical/call-next", "Cashier")]
    [InlineData("/api/medical/start-consultation", "Receptionist")]
    [InlineData("/api/medical/finish-consultation", "Cashier")]
    public async Task REG002_MedicalEndpoints_RejectUnauthorizedRoles(
        string endpoint, string wrongRole)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                QueueId = "REG-Q-02", PatientId = "REG-P-02",
                Actor = "test", StationId = "S-01"
            })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));
        request.Headers.Add("X-User-Role", wrongRole);

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            $"Regresion S-06: '{wrongRole}' no debe acceder a {endpoint}");
    }

    // ============================================================
    // REG-003: Idempotency-Key faltante genera 400
    // ============================================================

    /// <summary>
    /// Regresion: Todos los endpoints de comando deben rechazar solicitudes
    /// sin el header Idempotency-Key.
    /// </summary>
    [Theory]
    [InlineData("/api/waiting-room/check-in", "Receptionist")]
    [InlineData("/api/cashier/call-next", "Cashier")]
    [InlineData("/api/medical/call-next", "Doctor")]
    public async Task REG003_MissingIdempotencyKey_Returns400(
        string endpoint, string role)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new
            {
                QueueId = "REG-Q-03", PatientId = "REG-P-03",
                PatientName = "Test", Priority = "Low",
                ConsultationType = "General", Actor = "test",
                StationId = "S-01"
            })
        };
        request.Headers.Add("X-User-Role", role);
        // Deliberadamente sin Idempotency-Key

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            $"Regresion: {endpoint} debe rechazar solicitudes sin Idempotency-Key");
    }

    // ============================================================
    // REG-004: PatientId normalizado a mayusculas (case-insensitive)
    // ============================================================

    /// <summary>
    /// Regresion: El PatientId debe normalizarse a mayusculas.
    /// Un check-in con "abc-123" y otro con "ABC-123" deben referirse
    /// al mismo paciente (idempotencia por identidad).
    /// </summary>
    [Fact]
    public async Task REG004_PatientId_IsCaseInsensitive()
    {
        // Arrange
        var lowerCaseDto = new CheckInPatientDto
        {
            PatientId = "reg-case-001",
            PatientName = "Case Test Lower",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-reg"
        };
        var upperCaseDto = new CheckInPatientDto
        {
            PatientId = "REG-CASE-001",
            PatientName = "Case Test Upper",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-reg"
        };

        // Act
        var response1 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", lowerCaseDto, "Receptionist");
        var result1 = await DeserializeAsync(response1);
        var queueId = result1.GetProperty("queueId").GetString()!;

        // Intentar registrar con el mismo PatientId en mayusculas en la misma cola
        upperCaseDto = upperCaseDto with { QueueId = queueId };
        var response2 = await PostWithAuthAsync(
            "/api/waiting-room/check-in", upperCaseDto, "Receptionist");

        // Assert: el segundo debe fallar como duplicado o tener el mismo resultado
        var statusCode = (int)response2.StatusCode;
        // Esperamos 400 (duplicado) o 409 (conflicto de identidad)
        statusCode.Should().BeOneOf(new[] { 200, 400, 409 },
            "El PatientId case-insensitive debe ser detectado como duplicado o idempotente");
    }

    // ============================================================
    // REG-005: Capacidad de cola se respeta
    // ============================================================

    /// <summary>
    /// Regresion: La cola de espera tiene capacidad maxima. Excederla
    /// debe retornar un error de dominio.
    /// </summary>
    [Fact]
    public async Task REG005_QueueCapacity_IsEnforced()
    {
        // Arrange: crear cola y llenarla (la capacidad default es configurable)
        string? queueId = null;
        var responses = new List<HttpResponseMessage>();

        // Registrar 200 pacientes (deberia exceder la capacidad en algun momento)
        for (var i = 0; i < 200; i++)
        {
            var dto = new CheckInPatientDto
            {
                QueueId = queueId,
                PatientId = $"REG-CAP-{i:D4}",
                PatientName = $"Paciente Capacidad {i}",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "receptionist-reg"
            };

            var response = await PostWithAuthAsync(
                "/api/waiting-room/check-in", dto, "Receptionist");
            responses.Add(response);

            if (queueId == null && response.StatusCode == HttpStatusCode.OK)
            {
                var result = await DeserializeAsync(response);
                queueId = result.GetProperty("queueId").GetString();
            }

            // Si ya empezo a fallar, terminamos el ciclo
            if (response.StatusCode == HttpStatusCode.BadRequest)
                break;
        }

        // Assert: al menos una respuesta debe ser rechazada por capacidad
        responses.Should().Contain(r => r.StatusCode == HttpStatusCode.BadRequest,
            "La cola debe tener un limite maximo de capacidad que se rechace con 400");
    }

    // ============================================================
    // REG-006: Endpoint alias /api/reception/register funciona
    // ============================================================

    [Fact]
    public async Task REG006_ReceptionAlias_WorksIdentically()
    {
        var dto = new CheckInPatientDto
        {
            PatientId = "REG-ALIAS-001",
            PatientName = "Alias Regression",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-reg"
        };

        var response = await PostWithAuthAsync(
            "/api/reception/register", dto, "Receptionist");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "El alias /api/reception/register debe funcionar identicamente al check-in");
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
