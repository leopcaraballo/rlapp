using Scalar.AspNetCore;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using Serilog;
using WaitingRoom.API.Security;
using WaitingRoom.API.Validation;
using WaitingRoom.API.Middleware;
using WaitingRoom.API.Endpoints;
using WaitingRoom.API.Hubs;
using WaitingRoom.API.Services;
using WaitingRoom.Application.CommandHandlers;
using WaitingRoom.Application.DTOs;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Application.Services;
using WaitingRoom.Domain.Events;
using WaitingRoom.Infrastructure.Messaging;
using WaitingRoom.Infrastructure.Persistence.Repositories;
using WaitingRoom.Infrastructure.Persistence.EventStore;
using WaitingRoom.Infrastructure.Persistence;
using WaitingRoom.Infrastructure.Persistence.Outbox;
using WaitingRoom.Infrastructure.Persistence.Idempotency;
using WaitingRoom.Infrastructure.Observability;
using WaitingRoom.Infrastructure.Projections;
using WaitingRoom.Infrastructure.Serialization;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Projections.Implementations;
using BuildingBlocks.EventSourcing;
using BuildingBlocks.Observability;
using Prometheus;

// ==============================================================================
// RLAPP — WaitingRoom.API
// Hexagonal Architecture — Presentation Layer (Adapter)
//
// Responsibilities:
// - Expose HTTP endpoints
// - Handle authentication/authorization
// - Map DTOs to Commands
// - Inject CorrelationId
// - Route to Application layer
//
// Architecture:
// - NO business logic
// - NO domain knowledge
// - Pure adapter/presenter
// - Dependency Injection composition root
// ==============================================================================

var builder = WebApplication.CreateBuilder(args);

// ==============================================================================
// LOGGING CONFIGURATION — Structured Logging with Serilog
// ==============================================================================

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// ==============================================================================
// CONFIGURATION OPTIONS
// ==============================================================================

var connectionString = builder.Configuration.GetConnectionString("EventStore")
    ?? (builder.Environment.IsEnvironment("Testing")
        ? "Host=localhost;Port=5432;Database=rlapp_testing;"  // Placeholder — services overridden by WebApplicationFactory
        : throw new InvalidOperationException("EventStore connection string is required"));

var rabbitMqOptions = new RabbitMqOptions();
builder.Configuration.GetSection("RabbitMq").Bind(rabbitMqOptions);

// ==============================================================================
// DEPENDENCY INJECTION — Composition Root (Hexagonal Architecture)
// ==============================================================================

var services = builder.Services;

// ==============================================================================
// JWT AUTHENTICATION & AUTHORIZATION
// ==============================================================================

var jwtOptions = new JwtOptions();
builder.Configuration.GetSection(JwtOptions.SectionName).Bind(jwtOptions);
services.AddJwtAuthentication(jwtOptions);

// Infrastructure — Outbox Store
services.AddSingleton<IOutboxStore>(sp => new PostgresOutboxStore(connectionString));

// Infrastructure — Idempotency Store (CRITICAL for Check-In idempotence)
services.AddSingleton<IIdempotencyStore>(sp => new PostgresIdempotencyStore(connectionString));

// Infrastructure — Lag Tracker
services.AddSingleton<IEventLagTracker>(sp => new PostgresEventLagTracker(connectionString));

// Infrastructure — Event Type Registry
services.AddSingleton<EventTypeRegistry>(sp => EventTypeRegistry.CreateDefault());

// Infrastructure — Clinical identity + queue id generation
services.AddSingleton<IPatientIdentityRegistry>(sp => new PostgresPatientIdentityRegistry(connectionString));
services.AddSingleton<IServiceIdGenerator, GuidServiceIdGenerator>();

// Infrastructure — Event Serializer
services.AddSingleton<EventSerializer>();

// Infrastructure — Event Publisher (Outbox only; Worker dispatches)
services.AddSingleton<IEventPublisher, OutboxEventPublisher>();

// Infrastructure — Event Store (PostgreSQL)
services.AddSingleton<IEventStore>(sp =>
{
    var serializer = sp.GetRequiredService<EventSerializer>();
    var outboxStore = sp.GetRequiredService<IOutboxStore>();
    var lagTracker = sp.GetRequiredService<IEventLagTracker>();
    return new PostgresEventStore(connectionString, serializer, outboxStore, lagTracker);
});

// Application — Clock
services.AddSingleton<IClock, SystemClock>();

// Application — Command Handlers
services.AddScoped<CheckInPatientCommandHandler>();
services.AddScoped<CallNextCashierCommandHandler>();
services.AddScoped<ValidatePaymentCommandHandler>();
services.AddScoped<MarkPaymentPendingCommandHandler>();
services.AddScoped<MarkAbsentAtCashierCommandHandler>();
services.AddScoped<CancelByPaymentCommandHandler>();
services.AddScoped<ActivateConsultingRoomCommandHandler>();
services.AddScoped<DeactivateConsultingRoomCommandHandler>();
services.AddScoped<ClaimNextPatientCommandHandler>();
services.AddScoped<CallPatientCommandHandler>();
services.AddScoped<CompleteAttentionCommandHandler>();
services.AddScoped<MarkAbsentAtConsultationCommandHandler>();

// Infrastructure — Repositories
services.AddSingleton<IPatientStateRepository>(sp => new PostgresPatientStateRepository(connectionString));
services.AddSingleton<IConsultingRoomOccupancyRepository>(sp => new PostgresConsultingRoomOccupancyRepository(connectionString));
services.AddSingleton<ICashierQueueRepository>(sp => new PostgresCashierQueueRepository(connectionString));
services.AddSingleton<IPatientRepository, PatientRepository>();
services.AddSingleton<IConsultingRoomRepository, ConsultingRoomRepository>();

// Projections (in-memory context for API query runtime)
services.AddSingleton<IAtencionProjectionContext, InMemoryAtencionProjectionContext>();
services.AddSingleton<IProjection>(sp =>
{
    var context = sp.GetRequiredService<IAtencionProjectionContext>();
    var eventStore = sp.GetRequiredService<IEventStore>();
    var logger = sp.GetRequiredService<ILogger<WaitingRoomProjectionEngine>>();
    return new WaitingRoomProjectionEngine(
            sp.GetRequiredService<IAtencionProjectionContext>(),
            sp.GetRequiredService<IEventStore>(),
            sp.GetRequiredService<IPatientStateRepository>(),
            sp.GetRequiredService<IConsultingRoomOccupancyRepository>(),
            sp.GetRequiredService<ICashierQueueRepository>(),
            sp.GetRequiredService<ILogger<WaitingRoomProjectionEngine>>());
});

// ==============================================================================
// API SERVICES
// ==============================================================================

services.AddEndpointsApiExplorer();
services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "RLAPP — WaitingRoom API",
            Version = "v1",
            Description = "API REST para gestion de sala de espera medica en tiempo real. "
                + "Arquitectura hexagonal con Event Sourcing, CQRS y Outbox Pattern. "
                + "Los comandos escriben eventos en el Event Store (PostgreSQL) y las consultas "
                + "leen proyecciones denormalizadas.",
            Contact = new OpenApiContact
            {
                Name = "Equipo RLAPP",
                Email = "soporte@rlapp.dev"
            },
            License = new OpenApiLicense
            {
                Name = "Uso interno"
            }
        };

        // // HUMAN CHECK — Ajustar los servidores segun el entorno de despliegue real
        document.Servers =
        [
            new OpenApiServer { Url = "http://localhost:5204", Description = "Desarrollo local" }
        ];

        return Task.CompletedTask;
    });
});
services.AddSignalR();
services.AddSingleton<IWaitingRoomNotifier, WaitingRoomNotifier>();
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(RegisterPatientCommandHandler).Assembly));

services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3011")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Health Checks
var healthChecks = services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

// Skip Postgres health check in Testing environment (no real DB)
if (!builder.Environment.IsEnvironment("Testing"))
{
    healthChecks.AddNpgSql(connectionString, name: "postgres", tags: new[] { "db", "postgres" });
}

// ==============================================================================
// APPLICATION PIPELINE
// ==============================================================================

var app = builder.Build();

// Initialize database schemas (idempotent, safe to call multiple times)
// Skip in Testing environment (WebApplicationFactory replaces all Postgres services)
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
    var logger = loggerFactory.CreateLogger<DatabaseInitializer>();
    var initializer = new DatabaseInitializer(connectionString, logger);
    await initializer.InitializeAsync();
}

// Middleware Pipeline (order matters)
app.UseCorrelationId();
app.UseIdempotencyKey();  // CRITICAL: Check and cache responses by idempotency key
app.UseMiddleware<ExceptionHandlerMiddleware>();
app.UseCors("FrontendDev");

// Autenticación y autorización JWT
app.UseAuthentication();
app.UseAuthorization();

// Prometheus metrics — expone /metrics para scraping
app.UseHttpMetrics();  // Metricas automaticas de peticiones HTTP
app.MapMetrics();      // Endpoint GET /metrics

// OpenAPI schema + Scalar interactive UI
// // HUMAN CHECK — En produccion real (no Docker local), considerar restringir acceso
// a la documentacion mediante autenticacion o deshabilitar completamente.
app.MapOpenApi();  // Serve OpenAPI schema at /openapi/v1.json

app.MapScalarApiReference(options =>
{
    options
        .WithTitle("RLAPP — WaitingRoom API")
        .WithTheme(ScalarTheme.BluePlanet)
        .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
});

// Development-only tools
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// ==============================================================================
// AUTHENTICATION ENDPOINT
// ==============================================================================

app.MapPost("/api/auth/token", (
    AuthTokenRequest request,
    JwtTokenGenerator tokenGenerator) =>
{
    if (string.IsNullOrWhiteSpace(request.UserId) ||
        string.IsNullOrWhiteSpace(request.UserName) ||
        string.IsNullOrWhiteSpace(request.Role))
    {
        return Results.BadRequest(new { Error = "UserId, UserName y Role son obligatorios." });
    }

    var allowedRoles = new[] { "Receptionist", "Cashier", "Doctor", "Admin" };
    if (!allowedRoles.Any(r => string.Equals(r, request.Role, StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest(new { Error = $"Rol inválido. Roles permitidos: {string.Join(", ", allowedRoles)}" });
    }

    var token = tokenGenerator.GenerateToken(request.UserId, request.UserName, request.Role);

    return Results.Ok(new
    {
        Token = token,
        ExpiresIn = app.Services.GetRequiredService<JwtOptions>().TokenExpirationMinutes * 60,
        TokenType = "Bearer"
    });
})
.WithName("GenerateAuthToken")
.WithTags("Authentication")
.WithSummary("Generar token JWT")
.WithDescription("Genera un token JWT para autenticación. En producción, este endpoint debe reemplazarse por un Identity Provider externo.")
.AllowAnonymous()
.Accepts<AuthTokenRequest>("application/json")
.Produces(200)
.Produces(400);

// ==============================================================================
// HEALTH CHECKS ENDPOINTS
// ==============================================================================

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("self") || check.Tags.Count == 0
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => true // All checks
});

var queryGroup = app.MapGroup("/api/v1/atencion")
    .WithTags("Waiting Room Queries");
app.MapWaitingRoomQueryEndpoints();
app.MapPatientEndpoints();
app.MapConsultingRoomEndpoints();

app.MapHub<WaitingRoomHub>("/ws/waiting-room");

var commandGroup = app.MapGroup(string.Empty);

static async Task ProjectQueueAsync(
    IProjection projection,
    IEventStore eventStore,
    string serviceId,
    CancellationToken cancellationToken)
{
    var queueEvents = await eventStore.GetEventsAsync(serviceId, cancellationToken);
    await projection.ProcessEventsAsync(queueEvents, cancellationToken);
}

// ==============================================================================
// API ENDPOINTS — Minimal API Pattern
// ==============================================================================

/// <summary>
/// POST /api/waiting-room/check-in
///
/// Check in a patient to a waiting queue.
///
/// Architecture:
/// - Entry point to the system (Hexagonal Adapter)
/// - Maps DTO → Command
/// - Injects CorrelationId
/// - Delegates to Application layer (CheckInPatientCommandHandler)
/// - Returns HTTP response
///
/// Flow:
/// // LEGACY HANDLERS RESTORED FOR BACKWARD COMPATIBILITY IN TESTS
commandGroup.MapPost("/api/waiting-room/check-in", async (
    CheckInPatientDto dto,
    HttpContext httpContext,
    CheckInPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    logger.LogInformation(
        "CheckIn request received. CorrelationId: {CorrelationId}, PatientId: {PatientId}",
        correlationId,
        dto.PatientId);

    // Map DTO → Command
    var command = new CheckInPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = dto.Priority,
        ConsultationType = dto.ConsultationType,
        Age = dto.Age,
        IsPregnant = dto.IsPregnant,
        Notes = dto.Notes,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    // Execute command via handler
    var eventCount = await handler.HandleAsync(command, cancellationToken);
    var serviceId = handler.LastGeneratedServiceId;
    if (!string.IsNullOrWhiteSpace(serviceId))
    {
        await ProjectQueueAsync(projection, eventStore, serviceId, cancellationToken);
        await notifier.NotifyQueueUpdatedAsync(serviceId, cancellationToken);
    }

    logger.LogInformation(
        "CheckIn completed. CorrelationId: {CorrelationId}, EventCount: {EventCount}",
        correlationId,
        eventCount);

    return Results.Ok(new
    {
        success = true,
        message = "Patient checked in successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        serviceId = serviceId,
        patientId = dto.PatientId,
        turnNumber = handler.LastTurnNumber
    });
})
.WithName("CheckInPatientLegacy")
.WithTags("WaitingRoom")
.WithSummary("Registrar paciente en cola de espera")
.WithDescription("Registra un nuevo paciente en la cola de espera indicada. Genera evento PatientCheckedIn en el Event Store.")
.AddEndpointFilter<ReceptionistOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CheckInPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/reception/register", async (
    CheckInPatientDto dto,
    HttpContext httpContext,
    CheckInPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CheckInPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = dto.Priority,
        ConsultationType = dto.ConsultationType,
        Age = dto.Age,
        IsPregnant = dto.IsPregnant,
        Notes = dto.Notes,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    var serviceId = handler.LastGeneratedServiceId;
    if (!string.IsNullOrWhiteSpace(serviceId))
    {
        await ProjectQueueAsync(projection, eventStore, serviceId, cancellationToken);
        await notifier.NotifyQueueUpdatedAsync(serviceId, cancellationToken);
    }

    return Results.Ok(new
    {
        success = true,
        message = "Patient registered successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        serviceId = serviceId,
        patientId = dto.PatientId,
        turnNumber = handler.LastTurnNumber
    });
})
.WithName("RegisterPatientReceptionLegacy")
.WithTags("Reception")
.WithSummary("Registrar paciente desde recepcion")
.WithDescription("Punto de entrada para recepcionistas. Registra paciente con los mismos datos que check-in pero desde el modulo de recepcion.")
.AddEndpointFilter<ReceptionistOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CheckInPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/patients/self-registration", async (
    CheckInPatientDto dto,
    HttpContext httpContext,
    CheckInPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CheckInPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = "Medium",
        ConsultationType = "General",
        Actor = "patient",
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    var serviceId = handler.LastGeneratedServiceId;
    if (!string.IsNullOrWhiteSpace(serviceId))
    {
        await ProjectQueueAsync(projection, eventStore, serviceId, cancellationToken);
        await notifier.NotifyQueueUpdatedAsync(serviceId, cancellationToken);
    }

    return Results.Ok(new
    {
        success = true,
        message = "Patient self-registered successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        serviceId = serviceId,
        patientId = dto.PatientId,
        turnNumber = handler.LastTurnNumber
    });
})
.WithName("SelfRegisterPatient")
.WithTags("Public")
.WithSummary("Autoregistro de paciente")
.WithDescription("Permite que un paciente se registre en la cola por sí mismo desde el kiosco.")
.AllowAnonymous()
.AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CheckInPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(500);
// END OF BLOCK 1
// START OF BLOCK 2
commandGroup.MapPost("/api/cashier/call-next", async (
    CallNextCashierDto dto,
    HttpContext httpContext,
    CallNextCashierCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CallNextCashierCommand
    {
        ServiceId = dto.ServiceId,
        Actor = dto.Actor,
        CashierDeskId = dto.CashierDeskId,
        CorrelationId = correlationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Next patient called at cashier",
        correlationId = correlationId,
        eventCount = result.EventCount,
        patientId = result.PatientId
    });
})
.WithName("CallNextCashierLegacy")
.WithTags("Cashier")
.WithSummary("Llamar siguiente paciente a caja")
.WithDescription("El cajero solicita el siguiente paciente en la cola para proceso de pago. Genera evento PatientCalledToCashier.")
.AddEndpointFilter<CashierOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CallNextCashierDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/validate-payment", async (
    ValidatePaymentDto dto,
    HttpContext httpContext,
    ValidatePaymentCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ValidatePaymentCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor ?? "Cashier_01",
        CorrelationId = correlationId
    };

    var response = await handler.Handle(command, cancellationToken);
    var eventCount = response.Success ? 1 : 0;
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Payment validated successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("ValidatePaymentLegacy")
.WithTags("Cashier")
.WithSummary("Validar pago del paciente")
.WithDescription("Confirma que el paciente ha completado el pago. Genera evento PaymentValidated y avanza el flujo hacia consulta medica.")
.AddEndpointFilter<CashierOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<ValidatePaymentDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/mark-payment-pending", async (
    MarkPaymentPendingDto dto,
    HttpContext httpContext,
    MarkPaymentPendingCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new MarkPaymentPendingCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Reason = dto.Reason,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Payment marked as pending",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("MarkPaymentPendingLegacy")
.WithTags("Cashier")
.WithSummary("Marcar pago como pendiente")
.WithDescription("Indica que el paciente tiene un pago pendiente. El paciente permanece en cola pero no avanza hasta que se resuelva.")
.AddEndpointFilter<CashierOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<MarkPaymentPendingDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/mark-absent", async (
    MarkAbsentAtCashierDto dto,
    HttpContext httpContext,
    MarkAbsentAtCashierCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new MarkAbsentAtCashierCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient marked absent at cashier",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("MarkAbsentAtCashierLegacy")
.WithTags("Cashier")
.WithSummary("Marcar paciente ausente en caja")
.WithDescription("Registra que el paciente no se presento cuando fue llamado a caja. Genera evento de ausencia.")
.AddEndpointFilter<CashierOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<MarkAbsentAtCashierDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/cashier/cancel-payment", async (
    CancelByPaymentDto dto,
    HttpContext httpContext,
    CancelByPaymentCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CancelByPaymentCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Reason = dto.Reason,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient cancelled by payment policy",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("CancelByPaymentLegacy")
.WithTags("Cashier")
.WithSummary("Cancelar atencion por politica de pago")
.WithDescription("Cancela la atencion del paciente por incumplimiento de pago. Genera evento CancelledByPayment.")
.AddEndpointFilter<CashierOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CancelByPaymentDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/call-next", async (
    ClaimNextPatientDto dto,
    HttpContext httpContext,
    ClaimNextPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ClaimNextPatientCommand
    {
        ServiceId = dto.ServiceId,
        Actor = dto.Actor,
        CorrelationId = correlationId,
        StationId = dto.StationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Next patient called for medical attention",
        correlationId = correlationId,
        eventCount = result.EventCount,
        patientId = result.PatientId,
        stationId = result.StationId
    });
})
.WithName("MedicalCallNextLegacy")
.WithTags("Medical")
.WithSummary("Llamar siguiente paciente para consulta medica")
.WithDescription("El medico solicita el siguiente paciente que ya completo el pago. Genera evento PatientClaimedForConsultation.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<ClaimNextPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/consulting-room/activate", async (
    ActivateConsultingRoomDto dto,
    HttpContext httpContext,
    ActivateConsultingRoomCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ActivateConsultingRoomCommand
    {
        ServiceId = dto.ServiceId,
        ConsultingRoomId = dto.ConsultingRoomId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Consulting room activated",
        correlationId = correlationId,
        eventCount = eventCount,
        consultingRoomId = dto.ConsultingRoomId
    });
})
.WithName("ActivateConsultingRoomLegacy")
.WithTags("Medical")
.WithSummary("Activar consultorio medico")
.WithDescription("Marca un consultorio como disponible para recibir pacientes. Genera evento ConsultingRoomActivated.")
.AddEndpointFilter<AdminOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<ActivateConsultingRoomDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/consulting-room/deactivate", async (
    DeactivateConsultingRoomDto dto,
    HttpContext httpContext,
    DeactivateConsultingRoomCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new DeactivateConsultingRoomCommand
    {
        ServiceId = dto.ServiceId,
        ConsultingRoomId = dto.ConsultingRoomId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Consulting room deactivated",
        correlationId = correlationId,
        eventCount = eventCount,
        consultingRoomId = dto.ConsultingRoomId
    });
})
.WithName("DeactivateConsultingRoomLegacy")
.WithTags("Medical")
.WithSummary("Desactivar consultorio medico")
.WithDescription("Marca un consultorio como no disponible. Los pacientes no seran asignados a este consultorio hasta reactivacion.")
.AddEndpointFilter<AdminOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<DeactivateConsultingRoomDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/start-consultation", async (
    CallPatientDto dto,
    HttpContext httpContext,
    CallPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CallPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Consultation started successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("StartConsultationLegacy")
.WithTags("Medical")
.WithSummary("Iniciar consulta medica")
.WithDescription("Registra que el paciente ha ingresado a consulta con el medico. Genera evento ConsultationStarted.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CallPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/finish-consultation", async (
    CompleteAttentionDto dto,
    HttpContext httpContext,
    CompleteAttentionCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CompleteAttentionCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Outcome = dto.Outcome,
        Notes = dto.Notes,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Consultation finished successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("FinishConsultationLegacy")
.WithTags("Medical")
.WithSummary("Finalizar consulta medica")
.WithDescription("Registra la finalizacion de la consulta con resultado y notas. Genera evento AttentionCompleted.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CompleteAttentionDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/medical/mark-absent", async (
    MarkAbsentAtConsultationDto dto,
    HttpContext httpContext,
    MarkAbsentAtConsultationCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new MarkAbsentAtConsultationCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient marked absent at consultation",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("MarkAbsentAtConsultationLegacy")
.WithTags("Medical")
.WithSummary("Marcar paciente ausente en consulta")
.WithDescription("Registra que el paciente no se presento a la consulta medica programada. Genera evento de ausencia.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<MarkAbsentAtConsultationDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/waiting-room/claim-next", async (
    ClaimNextPatientDto dto,
    HttpContext httpContext,
    ClaimNextPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
    httpContext.Response.Headers["Deprecation"] = "true";
    httpContext.Response.Headers["Link"] = "</api/medical/call-next>; rel=\"successor-version\"";

    logger.LogInformation(
        "ClaimNext request received. CorrelationId: {CorrelationId}, ServiceId: {ServiceId}",
        correlationId,
        dto.ServiceId);

    var command = new ClaimNextPatientCommand
    {
        ServiceId = dto.ServiceId,
        Actor = dto.Actor,
        CorrelationId = correlationId,
        StationId = dto.StationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient claimed successfully",
        correlationId = correlationId,
        eventCount = result.EventCount,
        patientId = result.PatientId,
        stationId = result.StationId
    });
})
.WithName("ClaimNextPatientLegacy")
.WithTags("WaitingRoom")
.WithSummary("[DEPRECATED] Reclamar siguiente paciente — usar /api/medical/call-next")
.WithDescription("Reclama el siguiente paciente disponible en la cola para atencion. Asigna la estacion indicada al paciente.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<ClaimNextPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/waiting-room/call-patient", async (
    CallPatientDto dto,
    HttpContext httpContext,
    CallPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
    httpContext.Response.Headers["Deprecation"] = "true";
    httpContext.Response.Headers["Link"] = "</api/medical/start-consultation>; rel=\"successor-version\"";

    var command = new CallPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient called successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("CallPatientLegacy")
.WithTags("WaitingRoom")
.WithSummary("[DEPRECATED] Llamar paciente — usar /api/medical/start-consultation")
.WithDescription("Llama a un paciente especifico de la cola para atencion. Genera evento PatientCalled.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CallPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/waiting-room/complete-attention", async (
    CompleteAttentionDto dto,
    HttpContext httpContext,
    CompleteAttentionCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
    httpContext.Response.Headers["Deprecation"] = "true";
    httpContext.Response.Headers["Link"] = "</api/medical/finish-consultation>; rel=\"successor-version\"";

    var command = new CompleteAttentionCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Outcome = dto.Outcome,
        Notes = dto.Notes,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Attention completed successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("CompleteAttentionLegacy")
.WithTags("WaitingRoom")
.WithSummary("[DEPRECATED] Completar atencion — usar /api/medical/finish-consultation")
.WithDescription("Marca la atencion del paciente como finalizada con resultado y notas opcionales. Genera evento AttentionCompleted.")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CompleteAttentionDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);

// ==============================================================================
// /api/atencion/* — Compatibility aliases required by integration test contract.
// Identical behavior to /api/waiting-room/* counterparts:
// same handlers, same auth filters, same validation.
// ==============================================================================

commandGroup.MapPost("/api/atencion/check-in", async (
    CheckInPatientDto dto,
    HttpContext httpContext,
    CheckInPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    logger.LogInformation(
        "CheckIn (atencion) request received. CorrelationId: {CorrelationId}, PatientId: {PatientId}",
        correlationId,
        dto.PatientId);

    var command = new CheckInPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = dto.Priority,
        ConsultationType = dto.ConsultationType,
        Age = dto.Age,
        IsPregnant = dto.IsPregnant,
        Notes = dto.Notes,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    var serviceId = handler.LastGeneratedServiceId;
    if (!string.IsNullOrWhiteSpace(serviceId))
    {
        await ProjectQueueAsync(projection, eventStore, serviceId, cancellationToken);
        await notifier.NotifyQueueUpdatedAsync(serviceId, cancellationToken);
    }

    logger.LogInformation(
        "CheckIn (atencion) completed. CorrelationId: {CorrelationId}, EventCount: {EventCount}",
        correlationId,
        eventCount);

    return Results.Ok(new
    {
        success = true,
        message = "Patient checked in successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        serviceId = serviceId,
        patientId = dto.PatientId,
        turnNumber = handler.LastTurnNumber
    });
})
.WithName("CheckInPatientAtencion")
.WithTags("WaitingRoom")
.WithSummary("Registrar paciente en cola de espera (ruta atencion)")
.AddEndpointFilter<ReceptionistOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CheckInPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(401)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/atencion/claim-next", async (
    ClaimNextPatientDto dto,
    HttpContext httpContext,
    ClaimNextPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new ClaimNextPatientCommand
    {
        ServiceId = dto.ServiceId,
        Actor = dto.Actor,
        CorrelationId = correlationId,
        StationId = dto.StationId
    };

    var result = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient claimed successfully",
        correlationId = correlationId,
        eventCount = result.EventCount,
        patientId = result.PatientId,
        stationId = result.StationId
    });
})
.WithName("ClaimNextPatientAtencion")
.WithTags("WaitingRoom")
.WithSummary("Reclamar siguiente paciente para consulta (ruta atencion)")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<ClaimNextPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(401)
.Produces(403)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/atencion/call-patient", async (
    CallPatientDto dto,
    HttpContext httpContext,
    CallPatientCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CallPatientCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Patient called successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("CallPatientAtencion")
.WithTags("WaitingRoom")
.WithSummary("Llamar paciente a consulta (ruta atencion)")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CallPatientDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(401)
.Produces(403)
.Produces(409)
.Produces(500);

commandGroup.MapPost("/api/atencion/complete-attention", async (
    CompleteAttentionDto dto,
    HttpContext httpContext,
    CompleteAttentionCommandHandler handler,
    IProjection projection,
    IEventStore eventStore,
    IWaitingRoomNotifier notifier,
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    var command = new CompleteAttentionCommand
    {
        ServiceId = dto.ServiceId,
        PatientId = dto.PatientId,
        Actor = dto.Actor,
        Outcome = dto.Outcome,
        Notes = dto.Notes,
        CorrelationId = correlationId
    };

    var eventCount = await handler.HandleAsync(command, cancellationToken);
    await ProjectQueueAsync(projection, eventStore, dto.ServiceId, cancellationToken);
    await notifier.NotifyQueueUpdatedAsync(dto.ServiceId, cancellationToken);

    return Results.Ok(new
    {
        success = true,
        message = "Attention completed successfully",
        correlationId = correlationId,
        eventCount = eventCount,
        patientId = dto.PatientId
    });
})
.WithName("CompleteAttentionAtencion")
.WithTags("WaitingRoom")
.WithSummary("Completar atencion medica (ruta atencion)")
.AddEndpointFilter<DoctorOnlyFilter>().AddEndpointFilterFactory(RequestValidationFilter.Factory)
.Accepts<CompleteAttentionDto>("application/json")
.Produces(200)
.Produces(400)
.Produces(401)
.Produces(403)
.Produces(409)
.Produces(500);
// END OF LEGACY HANDLERS
// ==============================================================================
// STARTUP
// ==============================================================================

// Ensure database schema exists (idempotent, required for all environments)
// Skip in Testing environment (WebApplicationFactory replaces all Postgres services)
if (!app.Environment.IsEnvironment("Testing"))
{
    var eventStore = app.Services.GetRequiredService<IEventStore>();
    if (eventStore is PostgresEventStore postgresEventStore)
    {
        await postgresEventStore.EnsureSchemaAsync();
        Log.Information("Database schema initialized");
    }
}

Log.Information("Starting WaitingRoom.API...");
Log.Information("Environment: {Environment}", app.Environment.EnvironmentName);

app.Run();

Log.Information("WaitingRoom.API stopped");
Log.CloseAndFlush();
// Expose Program class for WebApplicationFactory in integration tests
public partial class Program { }
