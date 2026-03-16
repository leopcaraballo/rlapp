namespace WaitingRoom.Tests.Integration.NonFunctional.Performance;

using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Tests.Integration.Infrastructure;
using Xunit;
using Xunit.Abstractions;

/// <summary>
/// Performance Tests: API Response Time — Nivel: Sistema | Tipo: No Funcional (Rendimiento)
/// Conocimiento: Black Box
///
/// Validan que los endpoints de la API responden dentro de umbrales aceptables
/// bajo condiciones normales y de carga concurrente.
///
/// Umbrales (para entorno de testing con in-memory fakes):
/// - Operacion individual: menos de 1000ms
/// - Concurrencia moderada (10 req): menos de 2000ms (p95)
/// - Concurrencia alta (50 req): menos de 5000ms (p95)
///
/// Principios de testing aplicados:
/// - P2 (Exhaustividad imposible): se seleccionan escenarios representativos.
/// - P3 (Shift Left): se detectan degradaciones de rendimiento temprano.
/// - P6 (Contexto): umbrales adaptados al entorno de test (in-memory).
/// </summary>
[Trait("Category", "Performance")]
[Trait("Level", "System")]
[Trait("Type", "NonFunctional")]
[Trait("Knowledge", "BlackBox")]
public sealed class ApiResponseTimeTests : IClassFixture<WaitingRoomApiFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiResponseTimeTests(WaitingRoomApiFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    // ============================================================
    // PERF-001: Check-in individual — tiempo de respuesta
    // ============================================================

    [Fact]
    public async Task PERF001_CheckIn_SingleRequest_RespondsWithinThreshold()
    {
        // Arrange
        var dto = new CheckInPatientDto
        {
            PatientId = "PERF-001-PAT",
            PatientName = "Performance Test",
            Priority = "Medium",
            ConsultationType = "General",
            Actor = "receptionist-perf"
        };

        // Act
        var sw = Stopwatch.StartNew();
        var response = await PostWithAuthAsync(
            "/api/waiting-room/check-in", dto, "Receptionist");
        sw.Stop();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _output.WriteLine($"PERF-001: Check-in individual = {sw.ElapsedMilliseconds}ms");
        sw.ElapsedMilliseconds.Should().BeLessThan(1000,
            "Un check-in individual debe responder en menos de 1 segundo");
    }

    // ============================================================
    // PERF-002: Health endpoint — tiempo de respuesta minimo
    // ============================================================

    [Fact]
    public async Task PERF002_HealthEndpoint_RespondsQuickly()
    {
        var sw = Stopwatch.StartNew();
        var response = await _client.GetAsync("/health/live");
        sw.Stop();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _output.WriteLine($"PERF-002: Health live = {sw.ElapsedMilliseconds}ms");
        sw.ElapsedMilliseconds.Should().BeLessThan(500,
            "El endpoint de health debe responder en menos de 500ms");
    }

    // ============================================================
    // PERF-003: 10 check-ins concurrentes — rendimiento moderado
    // ============================================================

    [Fact]
    public async Task PERF003_TenConcurrentCheckIns_AllCompleteWithinThreshold()
    {
        const int concurrency = 10;
        var tasks = new Task<(HttpStatusCode Status, long ElapsedMs)>[concurrency];

        // Act: lanzar 10 check-ins concurrentes
        for (var i = 0; i < concurrency; i++)
        {
            var index = i;
            tasks[i] = Task.Run(async () =>
            {
                var dto = new CheckInPatientDto
                {
                    PatientId = $"PERF-003-PAT-{index:D3}",
                    PatientName = $"Concurrent Patient {index}",
                    Priority = "Medium",
                    ConsultationType = "General",
                    Actor = "receptionist-perf"
                };

                var sw = Stopwatch.StartNew();
                var resp = await PostWithAuthAsync(
                    "/api/waiting-room/check-in", dto, "Receptionist");
                sw.Stop();
                return (resp.StatusCode, sw.ElapsedMilliseconds);
            });
        }

        var results = await Task.WhenAll(tasks);

        // Assert
        var successful = results.Where(r => r.Status == HttpStatusCode.OK).ToArray();
        var times = results.Select(r => r.ElapsedMs).OrderBy(t => t).ToArray();
        var p95 = times[(int)(times.Length * 0.95)];

        _output.WriteLine($"PERF-003: {successful.Length}/{concurrency} exitosos");
        _output.WriteLine($"PERF-003: Tiempos = min:{times.First()}ms, max:{times.Last()}ms, p95:{p95}ms");

        successful.Length.Should().Be(concurrency,
            "Todas las solicitudes concurrentes deben completarse exitosamente");
        p95.Should().BeLessThan(2000,
            "El percentil 95 de 10 solicitudes concurrentes debe ser menor a 2 segundos");
    }

    // ============================================================
    // PERF-004: 50 check-ins concurrentes — carga alta
    // ============================================================

    [Fact]
    public async Task PERF004_FiftyConcurrentCheckIns_SystemRemainsStable()
    {
        const int concurrency = 50;
        var results = new ConcurrentBag<(HttpStatusCode Status, long ElapsedMs)>();

        // Act: lanzar 50 check-ins concurrentes
        var sw = Stopwatch.StartNew();
        await Parallel.ForEachAsync(
            Enumerable.Range(0, concurrency),
            new ParallelOptions { MaxDegreeOfParallelism = 20 },
            async (i, _) =>
            {
                var dto = new CheckInPatientDto
                {
                    PatientId = $"PERF-004-PAT-{i:D3}",
                    PatientName = $"Load Patient {i}",
                    Priority = "Low",
                    ConsultationType = "General",
                    Actor = "receptionist-perf"
                };

                var reqSw = Stopwatch.StartNew();
                var resp = await PostWithAuthAsync(
                    "/api/waiting-room/check-in", dto, "Receptionist");
                reqSw.Stop();
                results.Add((resp.StatusCode, reqSw.ElapsedMilliseconds));
            });
        sw.Stop();

        // Assert
        var allResults = results.ToArray();
        var successCount = allResults.Count(r => r.Status == HttpStatusCode.OK);
        var times = allResults.Select(r => r.ElapsedMs).OrderBy(t => t).ToArray();
        var p95 = times[(int)(times.Length * 0.95)];
        var avg = times.Average();

        _output.WriteLine($"PERF-004: {successCount}/{concurrency} exitosos en {sw.ElapsedMilliseconds}ms total");
        _output.WriteLine($"PERF-004: min:{times.First()}ms, avg:{avg:F0}ms, p95:{p95}ms, max:{times.Last()}ms");

        successCount.Should().BeGreaterOrEqualTo((int)(concurrency * 0.9),
            "Al menos el 90% de las solicitudes deben completarse exitosamente");
        p95.Should().BeLessThan(5000,
            "El percentil 95 bajo carga de 50 solicitudes debe ser menor a 5 segundos");
    }

    // ============================================================
    // PERF-005: Flujo clinico completo — tiempo de respuesta end-to-end
    // ============================================================

    [Fact]
    public async Task PERF005_FullClinicalFlow_CompletesWithinThreshold()
    {
        var sw = Stopwatch.StartNew();

        // Paso 1: Check-in
        var checkInDto = new CheckInPatientDto
        {
            PatientId = "PERF-005-PAT",
            PatientName = "E2E Performance",
            Priority = "High",
            ConsultationType = "Cardiology",
            Actor = "receptionist-perf"
        };
        var checkInResp = await PostWithAuthAsync(
            "/api/waiting-room/check-in", checkInDto, "Receptionist");
        var queueId = (await DeserializeAsync(checkInResp)).GetProperty("queueId").GetString()!;

        // Paso 2: Activar consultorio
        await PostWithAuthAsync(
            "/api/medical/consulting-room/activate",
            new ActivateConsultingRoomDto
            {
                QueueId = queueId, ConsultingRoomId = "PERF-CONS",
                Actor = "coordinator-perf"
            }, "Admin");

        // Paso 3: Caja — llamar
        var cashierResp = await PostWithAuthAsync(
            "/api/cashier/call-next",
            new CallNextCashierDto { QueueId = queueId, Actor = "cashier-perf" },
            "Cashier");
        var patientId = (await DeserializeAsync(cashierResp)).GetProperty("patientId").GetString()!;

        // Paso 4: Caja — validar pago
        await PostWithAuthAsync(
            "/api/cashier/validate-payment",
            new ValidatePaymentDto
            {
                QueueId = queueId, PatientId = patientId,
                Actor = "cashier-perf", PaymentReference = "PAY-PERF"
            }, "Cashier");

        // Paso 5: Consulta — reclamar
        await PostWithAuthAsync(
            "/api/medical/call-next",
            new ClaimNextPatientDto
            {
                QueueId = queueId, Actor = "doctor-perf", StationId = "PERF-CONS"
            }, "Doctor");

        // Paso 6: Consulta — iniciar
        await PostWithAuthAsync(
            "/api/medical/start-consultation",
            new CallPatientDto
            {
                QueueId = queueId, PatientId = patientId, Actor = "doctor-perf"
            }, "Doctor");

        // Paso 7: Consulta — completar
        var completeResp = await PostWithAuthAsync(
            "/api/medical/finish-consultation",
            new CompleteAttentionDto
            {
                QueueId = queueId, PatientId = patientId,
                Actor = "doctor-perf", Outcome = "Completado"
            }, "Doctor");

        sw.Stop();

        // Assert
        completeResp.StatusCode.Should().Be(HttpStatusCode.OK);
        _output.WriteLine($"PERF-005: Flujo clinico completo (7 pasos) = {sw.ElapsedMilliseconds}ms");
        sw.ElapsedMilliseconds.Should().BeLessThan(5000,
            "El flujo clinico completo (7 pasos HTTP) debe completarse en menos de 5 segundos");
    }

    // ============================================================
    // PERF-006: Throughput — solicitudes por segundo
    // ============================================================

    [Fact]
    public async Task PERF006_Throughput_MeetsMinimumRequirements()
    {
        const int totalRequests = 30;
        var sw = Stopwatch.StartNew();

        for (var i = 0; i < totalRequests; i++)
        {
            var dto = new CheckInPatientDto
            {
                PatientId = $"PERF-006-PAT-{i:D3}",
                PatientName = $"Throughput Patient {i}",
                Priority = "Low",
                ConsultationType = "General",
                Actor = "receptionist-perf"
            };
            await PostWithAuthAsync("/api/waiting-room/check-in", dto, "Receptionist");
        }

        sw.Stop();

        var requestsPerSecond = totalRequests / (sw.ElapsedMilliseconds / 1000.0);
        _output.WriteLine($"PERF-006: {totalRequests} solicitudes en {sw.ElapsedMilliseconds}ms = {requestsPerSecond:F1} req/s");

        requestsPerSecond.Should().BeGreaterThan(5,
            "El sistema debe soportar al menos 5 check-ins por segundo en modo secuencial");
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
