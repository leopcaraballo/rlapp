namespace WaitingRoom.API.Endpoints;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Application.Ports;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Views;

/// <summary>
/// Query API endpoints for Atencion monitoring projections.
///
/// Endpoints:
/// GET /api/v1/atencion/{serviceId}/monitor → AtencionMonitorView
/// GET /api/v1/atencion/{serviceId}/queue-state → QueueStateView
/// POST /api/v1/atencion/{serviceId}/rebuild → 202 Accepted
///
/// These endpoints return DENORMALIZED READ MODELS.
/// They are separate from the write model (commands).
/// This is CQRS separation: fast queries via projections.
///
/// All endpoints:
/// - Accept GET/POST with valid HTTP semantics
/// - Return JSON via minimal API
/// - Handle errors gracefully
/// - Include health/status checks
/// </summary>
public static class AtencionQueryEndpoints
{
    public static void MapWaitingRoomQueryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/atencion")
            .WithTags("Waiting Room Queries");
        MapEndpoints(group);
    }

    public static void MapEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/{serviceId}/monitor", GetMonitorAsync)
            .WithName("GetMonitor")
            .WithSummary("Get waiting room monitor (KPI dashboard)")
            .WithDescription("Returns high-level metrics: patient counts by priority, average wait time, utilization.")
            .Produces<AtencionMonitorView>(StatusCodes.Status200OK)
            .Produces<ApiErrorResponse>(StatusCodes.Status404NotFound);

        group.MapGet("/{serviceId}/queue-state", GetQueueStateAsync)
            .WithName("GetQueueState")
            .WithSummary("Get queue current state (detailed view)")
            .WithDescription("Returns detailed queue state: patient list, capacity info, wait times.")
            .Produces<AtencionStateView>(StatusCodes.Status200OK)
            .Produces<ApiErrorResponse>(StatusCodes.Status404NotFound);

        group.MapGet("/{serviceId}/next-turn", GetNextTurnAsync)
            .WithName("GetNextTurn")
            .WithSummary("Get next operational turn")
            .WithDescription("Returns the currently claimed/called patient; if none, returns next waiting patient candidate.")
            .Produces<NextTurnView>(StatusCodes.Status200OK)
            .Produces<ApiErrorResponse>(StatusCodes.Status404NotFound);

        group.MapGet("/{serviceId}/recent-history", GetRecentHistoryAsync)
            .WithName("GetRecentHistory")
            .WithSummary("Get recent completed attentions")
            .WithDescription("Returns recent completed attentions for operational traceability.")
            .Produces<IReadOnlyList<RecentAttentionRecordView>>(StatusCodes.Status200OK)
            .Produces<ApiErrorResponse>(StatusCodes.Status404NotFound);

        group.MapGet("/{serviceId}/full-state", GetFullStateAsync)
            .WithName("GetFullState")
            .WithSummary("Get combined full queue state (waiting + in consultation + awaiting payment)")
            .WithDescription("Returns a denormalized snapshot of all patient buckets for a queue. Used by real-time turn panel.")
            .Produces<AtencionFullStateView>(StatusCodes.Status200OK)
            .Produces<ApiErrorResponse>(StatusCodes.Status404NotFound);

        group.MapPost("/{serviceId}/rebuild", RebuildProjectionAsync)
            .WithName("RebuildProjection")
            .WithSummary("Rebuild projection from events (async)")
            .WithDescription("Initiates full projection rebuild from event store. Returns 202 Accepted. Use for recovery or schema migration.")
            .Produces(StatusCodes.Status202Accepted)
            .Produces<ApiErrorResponse>(StatusCodes.Status500InternalServerError);

        // HU-R5: New GET endpoint — returns active consulting rooms from aggregate state.
        group.MapGet("/{serviceId}/consulting-rooms", GetConsultingRoomsAsync)
            .WithName("GetConsultingRooms")
            .WithSummary("Get active consulting rooms state")
            .WithDescription("Returns the list of active consulting room IDs for a queue, loaded from the event-sourced aggregate.")
            .Produces<ConsultingRoomsView>(StatusCodes.Status200OK)
            .Produces<ApiErrorResponse>(StatusCodes.Status404NotFound);
    }

    /// <summary>
    /// GET /api/v1/atencion/{serviceId}/monitor
    ///
    /// Returns high-level KPI metrics for the queue.
    /// Used for operations dashboards and monitoring.
    /// </summary>
    private static async Task<IResult> GetMonitorAsync(
        string serviceId,
        IAtencionProjectionContext context,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var view = await context.GetMonitorViewAsync(serviceId, cancellationToken);

            if (view == null)
                return Results.NotFound(new ApiErrorResponse
                {
                    Error = $"Queue monitor not found for {serviceId}",
                    StatusCode = 404
                });

            return Results.Ok(view);
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }

    /// <summary>
    /// GET /api/v1/atencion/{serviceId}/queue-state
    ///
    /// Returns detailed queue state with patient list.
    /// Used for detailed monitoring and patient management.
    /// </summary>
    private static async Task<IResult> GetQueueStateAsync(
        string serviceId,
        IAtencionProjectionContext context,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var view = await context.GetQueueStateViewAsync(serviceId, cancellationToken);

            if (view == null)
                return Results.NotFound(new ApiErrorResponse
                {
                    Error = $"Queue state not found for {serviceId}",
                    StatusCode = 404
                });

            return Results.Ok(view);
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> GetNextTurnAsync(
        string serviceId,
        IAtencionProjectionContext context,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var activeTurn = await context.GetNextTurnViewAsync(serviceId, cancellationToken);
            if (activeTurn != null)
                return Results.Ok(activeTurn);

            var queue = await context.GetQueueStateViewAsync(serviceId, cancellationToken);
            if (queue == null)
                return Results.NotFound(new ApiErrorResponse
                {
                    Error = $"Queue state not found for {serviceId}",
                    StatusCode = 404
                });

            var candidate = queue.PatientsInQueue.FirstOrDefault();
            if (candidate == null)
                return Results.NotFound(new ApiErrorResponse
                {
                    Error = $"No turn available for {serviceId}",
                    StatusCode = 404
                });

            return Results.Ok(new NextTurnView
            {
                ServiceId = serviceId,
                TurnNumber = candidate.TurnNumber,
                PatientId = candidate.PatientId,
                PatientName = candidate.PatientName,
                Priority = candidate.Priority,
                ConsultationType = "Pending",
                Status = "waiting",
                ClaimedAt = null,
                CalledAt = null,
                StationId = null,
                ProjectedAt = DateTimeOffset.UtcNow
            });
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> GetRecentHistoryAsync(
        string serviceId,
        int? limit,
        IAtencionProjectionContext context,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var effectiveLimit = limit.GetValueOrDefault(20);
            if (effectiveLimit <= 0)
                effectiveLimit = 20;

            var history = await context.GetRecentAttentionHistoryAsync(serviceId, effectiveLimit, cancellationToken);
            return Results.Ok(history);
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }

    /// <summary>
    /// GET /api/v1/atencion/{serviceId}/consulting-rooms  (HU-R5)
    ///
    /// Returns active consulting rooms by loading the aggregate from the event store.
    /// Used by the /consulting-rooms frontend page to show correct initial state.
    /// </summary>
    /// <summary>
    /// GET /api/v1/atencion/{serviceId}/full-state
    ///
    /// Returns a combined snapshot: waiting patients, patients in consultation,
    /// and patients awaiting payment — all from in-memory projections.
    /// Used by the real-time turn panel (frontend useAtencion hook).
    /// </summary>
    private static async Task<IResult> GetFullStateAsync(
        string serviceId,
        IAtencionProjectionContext context,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var view = await context.GetFullStateViewAsync(serviceId, cancellationToken);

            if (view == null)
                return Results.NotFound(new ApiErrorResponse
                {
                    Error = $"Full state not found for '{serviceId}'. Queue may not exist or projection has not been populated.",
                    StatusCode = 404
                });

            return Results.Ok(view);
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }

    private static readonly string[] AllKnownRooms = ["CONS-01", "CONS-02", "CONS-03", "CONS-04"];

    private static async Task<IResult> GetConsultingRoomsAsync(
        string serviceId,
        IEventStore eventStore,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var queue = await eventStore.LoadAsync<WaitingQueue>(serviceId, cancellationToken);

            if (queue is null)
                return Results.NotFound(new ApiErrorResponse
                {
                    Error = $"Queue '{serviceId}' not found",
                    StatusCode = 404
                });

            return Results.Ok(new ConsultingRoomsView
            {
                ServiceId = serviceId,
                ActiveRooms = queue.ActiveConsultingRooms.ToList(),
                AllRooms = AllKnownRooms
            });
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }

    /// <summary>
    /// POST /api/v1/atencion/{serviceId}/rebuild
    ///
    /// Initiates asynchronous projection rebuild.
    /// Returns 202 Accepted immediately.
    /// Rebuild happens in background.
    ///
    /// Use cases:
    /// - Full recovery from projection failure
    /// - Schema migration
    /// - Verification (rebuild and compare)
    /// </summary>
    private static async Task<IResult> RebuildProjectionAsync(
        string serviceId,
        IProjection projection,
        IHostApplicationLifetime hostApplicationLifetime,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
            return Results.BadRequest(new ApiErrorResponse
            {
                Error = "ServiceId required",
                StatusCode = 400
            });

        try
        {
            var logger = loggerFactory.CreateLogger("AtencionQueryEndpoints");

            _ = Task.Run(async () =>
            {
                try
                {
                    await projection.RebuildAsync(hostApplicationLifetime.ApplicationStopping);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Projection rebuild failed for queue {ServiceId}", serviceId);
                }
            }, hostApplicationLifetime.ApplicationStopping);

            return Results.Accepted(
                $"/api/v1/atencion/{serviceId}/monitor",
                new { message = "Projection rebuild initiated", serviceId });
        }
        catch (Exception)
        {
            return Results.InternalServerError();
        }
    }
}

/// <summary>
/// Standard error response format.
/// Used consistently across API.
/// </summary>
public record ApiErrorResponse
{
    public required string Error { get; init; }
    public required int StatusCode { get; init; }
    public string? Detail { get; init; }
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;
}

