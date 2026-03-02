namespace WaitingRoom.Tests.Integration.Infrastructure;

using BuildingBlocks.Observability;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using WaitingRoom.Application.Ports;
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

            // Register per-test in-memory fakes (Singleton = shared within one test factory instance)
            services.AddSingleton<IEventStore, InMemoryEventStore>();
            services.AddSingleton<IIdempotencyStore, InMemoryIdempotencyStore>();
            services.AddSingleton<IOutboxStore, InMemoryOutboxStore>();
            services.AddSingleton<IPatientIdentityRegistry, InMemoryPatientIdentityRegistry>();
            services.AddSingleton<IEventPublisher, NoOpEventPublisher>();
            services.AddSingleton<IEventLagTracker, NoOpEventLagTracker>();
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
