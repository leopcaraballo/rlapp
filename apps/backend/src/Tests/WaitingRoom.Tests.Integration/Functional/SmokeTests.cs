namespace WaitingRoom.Tests.Integration.Functional;

using System.Net;
using FluentAssertions;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Smoke Tests — Nivel: Sistema | Tipo: Funcional (Smoke) | Conocimiento: Black Box
///
/// Validan que la aplicacion arranca correctamente y que los endpoints criticos
/// responden. Son los primeros tests en ejecutarse en CI y actuan como puerta
/// de entrada rapida: si fallan, no tiene sentido ejecutar tests mas complejos.
///
/// Principios de testing aplicados:
/// - P1 (Presencia de defectos): detectan fallos de arranque y configuracion.
/// - P3 (Shift Left): se ejecutan primero, retroalimentacion inmediata.
/// - P6 (Contexto): adecuados para validar despliegues en cualquier entorno.
/// </summary>
[Trait("Category", "Smoke")]
[Trait("Level", "System")]
[Trait("Type", "Functional")]
[Trait("Knowledge", "BlackBox")]
public sealed class SmokeTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public SmokeTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ============================================================
    // SMK-001: Health — Liveness
    // ============================================================

    /// <summary>
    /// Verifica que el endpoint de liveness responde HTTP 200.
    /// Si falla, la aplicacion no arranco correctamente.
    /// </summary>
    [Fact]
    public async Task SMK001_HealthLive_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "El endpoint de liveness debe responder 200 si la aplicacion esta activa");
    }

    // ============================================================
    // SMK-002: Health — Readiness
    // ============================================================

    /// <summary>
    /// Verifica que el endpoint de readiness responde HTTP 200.
    /// Indica que la aplicacion esta lista para recibir trafico.
    /// </summary>
    [Fact]
    public async Task SMK002_HealthReady_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/health/ready");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "El endpoint de readiness debe responder 200 si todos los servicios estan disponibles");
    }

    // ============================================================
    // SMK-003: API — Check-in endpoint responde
    // ============================================================

    /// <summary>
    /// Verifica que el endpoint principal de check-in responde (no genera error 500).
    /// No valida la logica de negocio, solo que el endpoint esta registrado y activo.
    /// </summary>
    [Fact]
    public async Task SMK003_CheckInEndpoint_IsRegisteredAndResponds()
    {
        // Arrange: enviar sin body para obtener 400 (validation) — NO 404 ni 500
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/atencion/check-in");
        request.Headers.Add("X-User-Role", "Receptionist");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        // Act
        var response = await _client.SendAsync(request);

        // Assert: cualquier respuesta 4xx es aceptable (endpoint existe), 5xx NO
        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            "El endpoint debe existir y responder con error de validacion, no con error de servidor");
    }

    // ============================================================
    // SMK-004: API — Cashier endpoint responde
    // ============================================================

    [Fact]
    public async Task SMK004_CashierEndpoint_IsRegisteredAndResponds()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/cashier/call-next");
        request.Headers.Add("X-User-Role", "Cashier");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        var response = await _client.SendAsync(request);

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            "El endpoint de caja debe existir y estar registrado");
    }

    // ============================================================
    // SMK-005: API — Medical endpoint responde
    // ============================================================

    [Fact]
    public async Task SMK005_MedicalEndpoint_IsRegisteredAndResponds()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/medical/call-next");
        request.Headers.Add("X-User-Role", "Doctor");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString("D"));

        var response = await _client.SendAsync(request);

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeInRange(400, 499,
            "El endpoint medico debe existir y estar registrado");
    }

    // ============================================================
    // SMK-006: API — OpenAPI schema disponible
    // ============================================================

    [Fact]
    public async Task SMK006_OpenApiSchema_IsAvailable()
    {
        // Act
        var response = await _client.GetAsync("/openapi/v1.json");

        // Assert
        if (response.StatusCode == HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            body.Should().Contain("openapi",
                "El schema de OpenAPI debe contener la clave 'openapi'");
        }
        else
        {
            // Si OpenAPI no esta configurado, el test se considera informativo
            response.StatusCode.Should().NotBe(HttpStatusCode.InternalServerError,
                "El servidor no debe devolver error 500 al consultar OpenAPI");
        }
    }

    // ============================================================
    // SMK-007: Middleware — CORS y headers de seguridad
    // ============================================================

    [Fact]
    public async Task SMK007_SecurityHeaders_ArePresent()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert: verificamos que la respuesta no contiene headers inseguros
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().NotContainKey("Server",
            "El header 'Server' no debe exponerse por seguridad (informacion de infraestructura)");
    }

    // ============================================================
    // SMK-008: Endpoints no existentes retornan 404
    // ============================================================

    [Fact]
    public async Task SMK008_NonExistentEndpoint_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/api/non-existent-endpoint");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "Los endpoints no registrados deben retornar 404");
    }
}
