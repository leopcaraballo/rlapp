namespace WaitingRoom.Tests.Integration.API;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

/// <summary>
/// Integration tests for idempotency in the Check-In endpoint.
/// Uses WebApplicationFactory with in-memory fakes — no real PostgreSQL required.
///
/// Tests validate that:
/// 1. Identical requests with same Idempotency-Key get cached response
/// 2. Missing Idempotency-Key is rejected with 400
/// 3. Different keys are processed independently
/// 4. Retry scenario: same key returns identical response
/// </summary>
public sealed class CheckInIdempotencyTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public CheckInIdempotencyTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GivenValidCheckInRequest_WithIdempotencyKey_WhenCalledTwice_ThenReturnsCachedResponse()
    {
        // Arrange
        var idempotencyKey = Guid.NewGuid().ToString("D");
        var dto = BuildCheckInDto("PAT-IDEM-001", "John Idempotent", "High");

        // Act 1: Primera petición — debe crear la entrada en idempotency store
        var response1 = await SendCheckInAsync(dto, idempotencyKey);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        var body1 = await response1.Content.ReadAsStringAsync();
        var result1 = JsonSerializer.Deserialize<JsonElement>(body1);
        var queueId1 = result1.GetProperty("queueId").GetString();
        queueId1.Should().NotBeNullOrEmpty();

        // Act 2: Petición idéntica con la misma clave — debe devolver respuesta cacheada
        var response2 = await SendCheckInAsync(dto, idempotencyKey);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var body2 = await response2.Content.ReadAsStringAsync();
        var result2 = JsonSerializer.Deserialize<JsonElement>(body2);
        var queueId2 = result2.GetProperty("queueId").GetString();

        // Assert: Las dos respuestas deben ser idénticas
        queueId1.Should().Be(queueId2, "La misma clave de idempotencia debe devolver el mismo queueId");
        body1.Should().Be(body2, "El middleware debe devolver exactamente la respuesta cacheada");
        response2.Headers.Contains("Idempotency-Replayed")
            .Should().BeTrue("La segunda respuesta debe marcarse como reproducida desde caché");
    }

    [Fact]
    public async Task GivenCheckInRequest_WithoutIdempotencyKey_ThenReturnsBadRequest()
    {
        // Arrange
        var dto = BuildCheckInDto("PAT-NOIDEM-001", "No Idempotency", "High");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(dto),
            Headers = { { "X-User-Role", "Receptionist" } }
            // MISSING: Idempotency-Key header — must be rejected
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("MissingIdempotencyKey");
    }

    [Fact]
    public async Task GivenMultipleRequests_WithDifferentIdempotencyKeys_ThenCreatesDifferentQueues()
    {
        // Arrange
        var dto = BuildCheckInDto("PAT-MULTI-001", "Multi Key Patient", "Medium");

        var key1 = Guid.NewGuid().ToString("D");
        var key2 = Guid.NewGuid().ToString("D");

        // Act
        var response1 = await SendCheckInAsync(dto, key1);
        var response2 = await SendCheckInAsync(dto, key2);

        // Assert
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var body1 = await response1.Content.ReadAsStringAsync();
        var body2 = await response2.Content.ReadAsStringAsync();

        var queueId1 = JsonSerializer.Deserialize<JsonElement>(body1).GetProperty("queueId").GetString();
        var queueId2 = JsonSerializer.Deserialize<JsonElement>(body2).GetProperty("queueId").GetString();

        queueId1.Should().NotBe(queueId2, "Claves distintas deben generar colas distintas");
    }

    [Fact]
    public async Task GivenIdempotencyKey_WhenRetryOccurs_ThenReturnsIdenticalResponse()
    {
        // Arrange
        var idempotencyKey = Guid.NewGuid().ToString("D");
        var dto = BuildCheckInDto("PAT-RETRY-001", "Retry Patient", "Low", "Dental");

        // Act 1: Petición original
        var response1 = await SendCheckInAsync(dto, idempotencyKey);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        var body1 = await response1.Content.ReadAsStringAsync();

        // Act 2: Reintento con la misma clave (simula fallo de red + reintento del cliente)
        var response2 = await SendCheckInAsync(dto, idempotencyKey);

        // Assert
        response2.StatusCode.Should().Be(HttpStatusCode.OK);
        var body2 = await response2.Content.ReadAsStringAsync();

        body1.Should().Be(body2, "El reintento debe devolver exactamente la misma respuesta");
    }

    // ====================
    // Helpers privados
    // ====================

    private static CheckInPatientDto BuildCheckInDto(
        string patientId,
        string patientName,
        string priority,
        string consultationType = "General",
        string actor = "nurse-001")
        => new()
        {
            PatientId = patientId,
            PatientName = patientName,
            Priority = priority,
            ConsultationType = consultationType,
            Actor = actor
        };

    private Task<HttpResponseMessage> SendCheckInAsync(
        CheckInPatientDto dto,
        string idempotencyKey)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/waiting-room/check-in")
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", idempotencyKey }
            }
        };

        return _client.SendAsync(request);
    }
}
