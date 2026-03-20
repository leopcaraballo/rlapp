namespace WaitingRoom.Tests.Integration.API;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;

public sealed class PatientEndpointsHttpTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;

    public PatientEndpointsHttpTests(WaitingRoomApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task RegisterPatient_WithReceptionistRoleAndIdempotencyKey_ReturnsOkAndPayload()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/patients/register")
        {
            Content = JsonContent.Create(new
            {
                patientIdentity = "12312312",
                patientName = "Patient Register",
                phoneNumber = "555-3001"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Receptionist" }
            }
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        root.GetProperty("patientId").GetString().Should().NotBeNullOrWhiteSpace();
        root.GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task RegisterPatient_WithoutRoleHeader_ReturnsUnauthorized()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/patients/register")
        {
            Content = JsonContent.Create(new
            {
                patientIdentity = "32132132",
                patientName = "Patient No Role",
                phoneNumber = "555-3002"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") }
            }
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MarkWaiting_WhenRouteIdDoesNotMatchBodyId_ReturnsBadRequest()
    {
        var routePatientId = "PAT-ROUTE-001";

        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/patients/{routePatientId}/mark-waiting")
        {
            Content = JsonContent.Create(new
            {
                patientId = "PAT-BODY-002",
                actor = "reception-1"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Receptionist" }
            }
        };

        var response = await _client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.Should().Contain("ID mismatch");
    }

    [Fact]
    public async Task AssignRoom_WithDoctorRole_ReturnsForbidden()
    {
        var patientId = "PAT-ASSIGN-001";

        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/patients/{patientId}/assign-room")
        {
            Content = JsonContent.Create(new
            {
                patientId,
                consultingRoomId = "ROOM-101",
                actor = "doctor-1"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Doctor" }
            }
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ArriveCashier_WithReceptionistRole_ReturnsForbidden()
    {
        var patientId = "PAT-CASHIER-001";

        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/patients/{patientId}/arrive-cashier")
        {
            Content = JsonContent.Create(new
            {
                serviceId = "SERVICE-001",
                patientId,
                actor = "reception-1"
            }),
            Headers =
            {
                { "Idempotency-Key", Guid.NewGuid().ToString("D") },
                { "X-User-Role", "Receptionist" }
            }
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}