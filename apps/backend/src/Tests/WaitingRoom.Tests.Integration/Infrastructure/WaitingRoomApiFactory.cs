namespace WaitingRoom.Tests.Integration.Infrastructure;

using BuildingBlocks.Observability;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using WaitingRoom.Application.Ports;
using WaitingRoom.Projections.Abstractions;
using WaitingRoom.Tests.Integration.Fakes;

/// <summary>
/// Custom WebApplicationFactory that replaces all external dependencies
/// (PostgreSQL, RabbitMQ) with in-memory fakes.
///
/// Enables true integration testing without any infrastructure services:
/// - IEventStore → InMemoryEventStore
/// - IIdempotencyStore → InMemoryIdempotencyStore
/// - IOutboxStore → InMemoryOutboxStore
/// - IPatientIdentityRegistry → InMemoryPatientIdentityRegistry
/// - IEventPublisher → NoOpEventPublisher
/// - IEventLagTracker → NoOpEventLagTracker
/// - Authentication → TestAuthHandler (reemplaza JWT Bearer)
/// </summary>
public sealed class WaitingRoomApiFactory : WebApplicationFactory<global::Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Mark as Testing environment so Program.cs skips DB initialization
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Remove all real infrastructure registrations
            RemoveService<IEventStore>(services);
            RemoveService<IIdempotencyStore>(services);
            RemoveService<IOutboxStore>(services);
            RemoveService<IPatientIdentityRegistry>(services);
            RemoveService<IEventPublisher>(services);
            RemoveService<IEventLagTracker>(services);
            RemoveService<IPatientStateRepository>(services);
            RemoveService<IConsultingRoomOccupancyRepository>(services);
            RemoveService<ICashierQueueRepository>(services);
            RemoveService<IPatientRepository>(services);
            RemoveService<IConsultingRoomRepository>(services);
            // IProjection is NOT replaced: WaitingRoomProjectionEngine is resolved from Program.cs
            // using all in-memory fakes below, so it correctly populates IAtencionProjectionContext.

            // Register per-test in-memory fakes (Singleton = shared within one test factory instance)
            services.AddSingleton<IEventStore, InMemoryEventStore>();
            services.AddSingleton<IIdempotencyStore, InMemoryIdempotencyStore>();
            services.AddSingleton<IOutboxStore, InMemoryOutboxStore>();
            services.AddSingleton<IPatientIdentityRegistry, InMemoryPatientIdentityRegistry>();
            services.AddSingleton<IEventPublisher, NoOpEventPublisher>();
            services.AddSingleton<IEventLagTracker, NoOpEventLagTracker>();
            services.AddSingleton<IPatientStateRepository, InMemoryPatientStateRepository>();
            services.AddSingleton<IConsultingRoomOccupancyRepository, InMemoryConsultingRoomOccupancyRepository>();
            services.AddSingleton<ICashierQueueRepository, InMemoryCashierQueueRepository>();
            services.AddSingleton<IPatientRepository, InMemoryPatientRepository>();
            services.AddSingleton<IConsultingRoomRepository, InMemoryConsultingRoomRepository>();

            // Reemplazar JWT Bearer con TestAuthHandler para tests de integracion.
            // TestAuthHandler lee el header X-User-Role y genera claims equivalentes
            // a un token JWT, permitiendo que los endpoint filters usen Strategy 1 (JWT).
            // Se sobreescriben DefaultAuthenticateScheme y DefaultChallengeScheme
            // porque Program.cs los establece explicitamente para JWT Bearer.
            services.AddAuthentication(options =>
                {
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }

    /// <summary>
    /// Removes all registrations of a given service type from the DI container.
    /// </summary>
    private static void RemoveService<T>(IServiceCollection services)
    {
        var descriptors = services
            .Where(d => d.ServiceType == typeof(T))
            .ToList();

        foreach (var descriptor in descriptors)
            services.Remove(descriptor);
    }
}
