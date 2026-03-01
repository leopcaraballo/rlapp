namespace WaitingRoom.API.Middleware;

using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using WaitingRoom.Application.Ports;

/// <summary>
/// Middleware that enforces idempotency for POST/PATCH/PUT requests.
///
/// Design:
/// 1. Checks for "Idempotency-Key" header
/// 2. Returns 400 if missing (required for state-changing requests)
/// 3. Checks if key already processed
/// 4. If yes → returns cached response immediately
/// 5. If no → allows request through pipeline
/// 6. Upon success, caches response in idempotency store
///
/// This guarantees true idempotence across:
/// - Network retries
/// - Application restarts
/// - Concurrent duplicate requests
/// - Long-running operations
///
/// Clinical Context:
/// - Patient check-in must be idempotent (network can fail)
/// - Retrying same check-in must succeed with identical outcome
/// - No duplicate patients in system
/// </summary>
public sealed class IdempotencyKeyMiddleware
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> KeyLocks = new(StringComparer.Ordinal);
    private readonly RequestDelegate _next;
    private readonly ILogger<IdempotencyKeyMiddleware> _logger;
    private readonly IIdempotencyStore _idempotencyStore;

    public IdempotencyKeyMiddleware(
        RequestDelegate next,
        ILogger<IdempotencyKeyMiddleware> logger,
        IIdempotencyStore idempotencyStore)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _idempotencyStore = idempotencyStore ?? throw new ArgumentNullException(nameof(idempotencyStore));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only enforce idempotency for state-changing operations
        if (!IsStateChangingRequest(context.Request.Method, context.Request.Path))
        {
            await _next(context);
            return;
        }

        // Require Idempotency-Key header for POST/PATCH/PUT
        var idempotencyKey = context.Request.Headers["Idempotency-Key"].ToString();
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            _logger.LogWarning(
                "State-changing request missing Idempotency-Key header. Method: {Method}, Path: {Path}",
                context.Request.Method,
                context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                Error = "MissingIdempotencyKey",
                Message = "State-changing requests require 'Idempotency-Key' header"
            });
            return;
        }

        var keyLock = KeyLocks.GetOrAdd(idempotencyKey, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync(context.RequestAborted);

        try
        {
            var cachedRecord = await _idempotencyStore.GetRecordAsync(idempotencyKey, context.RequestAborted);
            if (cachedRecord is not null)
            {
                _logger.LogInformation(
                    "Returning cached response for duplicate idempotency key. Key: {IdempotencyKey}",
                    idempotencyKey);

                context.Response.StatusCode = cachedRecord.StatusCode;
                context.Response.ContentType = "application/json";
                context.Response.Headers["Idempotency-Key"] = idempotencyKey;
                context.Response.Headers["Idempotency-Replayed"] = "true";

                await context.Response.WriteAsync(cachedRecord.ResponsePayload);
                return;
            }

            var originalBodyStream = context.Response.Body;
            await using var responseBuffer = new MemoryStream();
            context.Response.Body = responseBuffer;

            var requestBody = await ReadRequestBodyAsync(context.Request);
            var requestHash = ComputeSha256Hash(requestBody);

            context.Items["IdempotencyKey"] = idempotencyKey;
            context.Items["RequestHash"] = requestHash;
            context.Items["RequestBody"] = requestBody;

            await _next(context);

            if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
            {
                await PersistIdempotencyRecord(
                    idempotencyKey,
                    requestHash,
                    responseBuffer,
                    context.Response.StatusCode,
                    context.RequestAborted);
            }

            responseBuffer.Position = 0;
            await responseBuffer.CopyToAsync(originalBodyStream, context.RequestAborted);
        }
        finally
        {
            keyLock.Release();
        }
    }

    private static bool IsStateChangingRequest(string method, PathString path)
    {
        // Only POST, PATCH, PUT require idempotency
        if (!new[] { "POST", "PATCH", "PUT" }.Contains(method.ToUpperInvariant()))
            return false;

        // Exclude health checks and diagnostics
        var pathStr = path.ToString().ToLowerInvariant();
        if (pathStr.Contains("/health") || pathStr.Contains("/metrics"))
            return false;

        return true;
    }

    private static async Task<string> ReadRequestBodyAsync(HttpRequest request)
    {
        request.EnableBuffering();
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;
        return body;
    }

    private static string ComputeSha256Hash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var sb = new StringBuilder();
        foreach (var b in bytes)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    private async Task PersistIdempotencyRecord(
        string idempotencyKey,
        string requestHash,
        MemoryStream responseStream,
        int statusCode,
        CancellationToken cancellationToken)
    {
        try
        {
            responseStream.Position = 0;
            using var reader = new StreamReader(responseStream, Encoding.UTF8, leaveOpen: true);
            var responsePayload = await reader.ReadToEndAsync(cancellationToken);

            responseStream.Position = 0;

            await _idempotencyStore.RecordAsync(
                idempotencyKey,
                requestHash,
                responsePayload,
                statusCode,
                cancellationToken);

            _logger.LogInformation(
                "Persisted idempotency record. Key: {IdempotencyKey}, StatusCode: {StatusCode}",
                idempotencyKey,
                statusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to persist idempotency record. Key: {IdempotencyKey}",
                idempotencyKey);

            // Don't throw - response was already sent to client
        }
    }
}

/// <summary>
/// Extension method to register IdempotencyKeyMiddleware in pipeline.
/// </summary>
public static class IdempotencyKeyMiddlewareExtensions
{
    public static IApplicationBuilder UseIdempotencyKey(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<IdempotencyKeyMiddleware>();
    }
}
