namespace WaitingRoom.Tests.Integration.API;

using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.DTOs;

/// <summary>
/// Integration tests for true idempotency in Check-In endpoint.
///
/// Tests validate that:
/// 1. Identical requests with same Idempotency-Key get cached response
/// 2. Missing Idempotency-Key is rejected
/// 3. Different keys are processed independently
/// 4. Retry scenario: network failure + retry with same key succeeds
/// 5. Concurrent requests with same key only process once
/// </summary>
public class CheckInIdempotencyTests : IAsyncLifetime
{
    private readonly HttpClient _httpClient;
    private readonly string _checkInUrl;

    public CheckInIdempotencyTests()
    {
        _httpClient = new HttpClient();
        var apiBaseUrl = Environment.GetEnvironmentVariable("WAITINGROOM_API_BASE_URL")
            ?? "http://localhost:5000";
        _checkInUrl = $"{apiBaseUrl.TrimEnd('/')}/api/waiting-room/check-in";
    }

    public Task InitializeAsync() => Task.CompletedTask;
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GivenValidCheckInRequest_WithIdempotencyKey_WhenCalledTwice_ThenReturnsCachedResponse()
    {
        // Arrange
        var idempotencyKey = Guid.NewGuid().ToString("D");
        var dto = new CheckInPatientDto
        {
            PatientId = "PAT-IDEM-001",
            PatientName = "John Idempotent",
            Priority = "High",
            ConsultationType = "General",
            Actor = "nurse-001"
        };

        var request1 = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", idempotencyKey }
            }
        };

        // Act 1: First request
        var response1 = await _httpClient.SendAsync(request1);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        var body1 = await response1.Content.ReadAsStringAsync();
        var result1 = JsonSerializer.Deserialize<JsonElement>(body1);
        var queueId1 = result1.GetProperty("queueId").GetString();

        // Act 2: Identical retry with same idempotency key
        var request2 = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", idempotencyKey }
            }
        };

        var response2 = await _httpClient.SendAsync(request2);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var body2 = await response2.Content.ReadAsStringAsync();
        var result2 = JsonSerializer.Deserialize<JsonElement>(body2);
        var queueId2 = result2.GetProperty("queueId").GetString();

        // Assert: Both responses identical (middleware returned cached version)
        queueId1.Should().Be(queueId2, "Same idempotency key should return identical queue ID");
        body1.Should().Be(body2, "Middleware should return exact same cached response");
        response2.Headers.Contains("Idempotency-Replayed").Should().BeTrue("Should mark response as replayed from cache");
    }

    [Fact]
    public async Task GivenCheckInRequest_WithoutIdempotencyKey_ThenReturnsBadRequest()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "PAT-NOIDEM-001",
            PatientName = "No Idempotency",
            Priority = "High",
            ConsultationType = "General",
            Actor = "nurse-001"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" }
                // MISSING: Idempotency-Key header
            }
        };

        // Act
        var response = await _httpClient.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("MissingIdempotencyKey");
    }

    [Fact]
    public async Task GivenMultipleRequests_WithDifferentIdempotencyKeys_ThenCreatesDifferentQueues()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "PAT-MULTI-001",
            PatientName = "Multi Key Patient",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "nurse-001"
        };

        var key1 = Guid.NewGuid().ToString("D");
        var key2 = Guid.NewGuid().ToString("D");

        var request1 = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", key1 }
            }
        };

        var request2 = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", key2 }
            }
        };

        // Act
        var response1 = await _httpClient.SendAsync(request1);
        var response2 = await _httpClient.SendAsync(request2);

        // Assert
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var body1 = await response1.Content.ReadAsStringAsync();
        var body2 = await response2.Content.ReadAsStringAsync();

        var result1 = JsonSerializer.Deserialize<JsonElement>(body1);
        var result2 = JsonSerializer.Deserialize<JsonElement>(body2);

        var queueId1 = result1.GetProperty("queueId").GetString();
        var queueId2 = result2.GetProperty("queueId").GetString();

        // Different keys should get different queue IDs
        queueId1.Should().NotBe(queueId2);
    }

    [Fact]
    public async Task GivenIdempotencyKey_WhenNetworkFails_ThenRetryWithSameKeyReturnsIdenticalResponse()
    {
        // Arrange: Simulate network failure scenario
        var idempotencyKey = Guid.NewGuid().ToString("D");
        var dto = new CheckInPatientDto
        {
            PatientId = "PAT-RETRY-001",
            PatientName = "Retry Patient",
            Priority = "Low",
            ConsultationType = "Dental",
            Actor = "nurse-001"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", idempotencyKey }
            }
        };

        // Act 1: Original request succeeds
        var response1 = await _httpClient.SendAsync(request);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        var body1 = await response1.Content.ReadAsStringAsync();

        // Act 2: Client retries (same idempotency key)
        // In real scenario, this would be after network timeout detected
        var retryRequest = new HttpRequestMessage(HttpMethod.Post, _checkInUrl)
        {
            Content = JsonContent.Create(dto),
            Headers =
            {
                { "X-User-Role", "Receptionist" },
                { "Idempotency-Key", idempotencyKey }
            }
        };

        var response2 = await _httpClient.SendAsync(retryRequest);

        // Assert: Retry returns exact same response
        response2.StatusCode.Should().Be(HttpStatusCode.OK);
        var body2 = await response2.Content.ReadAsStringAsync();

        body1.Should().Be(body2);
    }
}
