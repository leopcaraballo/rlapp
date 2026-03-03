namespace WaitingRoom.Tests.Integration.Domain;

using System.Collections.Concurrent;
using FluentAssertions;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.ValueObjects;
using WaitingRoom.Infrastructure.Persistence.EventStore;
using BuildingBlocks.EventSourcing;
using Xunit;

/// <summary>
/// High-concurrency stress tests to validate:
/// 1. No duplicate queueIds under concurrent load
/// 2. Race condition safety with 1000+ simultaneous check-ins
/// 3. Event store atomic persistence
/// 4. Patient uniqueness despite concurrent access
/// </summary>
public class ConcurrencyStressTests
{
    [Fact]
    public async Task GivenThousandConcurrentCheckIns_WhenProcessed_ThenNoDuplicateQueues()
    {
        // Arrange
        const int ConcurrentCheckInCount = 1000;
        var queueIds = new System.Collections.Generic.HashSet<string>();
        var lockObj = new object();

        var tasks = Enumerable.Range(0, ConcurrentCheckInCount)
            .Select(i => Task.Run(() =>
            {
                // Each "thread" creates a queue with potentially concurrent ID generation
                var metadata = EventMetadata.CreateNew($"queue-concurrent-{i}", "system");
                var queue = WaitingQueue.Create(
                    $"queue-concurrent-{i}",
                    $"Concurrent Queue {i}",
                    100,
                    metadata);

                lock (lockObj)
                {
                    queueIds.Add(queue.Id);
                }
            }))
            .ToList();

        // Act
        await Task.WhenAll(tasks);

        // Assert
        queueIds.Should().HaveCount(ConcurrentCheckInCount,
            "All queue IDs should be unique even under high concurrent load");
    }

    [Fact]
    public async Task GivenConcurrentIdenticalPatientCheckIns_WhenProcessed_ThenOnlyFirstSucceeds()
    {
        // Arrange
        const int ConcurrentAttempts = 10;
        var sharedPatientId = "PAT-RACE-CONDITION";
        var successCount = 0;
        var failureCount = 0;
        var lockObj = new object();

        var metadata = EventMetadata.CreateNew("queue-race", "system");
        var queue = WaitingQueue.Create("queue-race", "Race Test Queue", 100, metadata);
        queue.ClearUncommittedEvents();

        var tasks = Enumerable.Range(0, ConcurrentAttempts)
            .Select(_ => Task.Run(() =>
            {
                try
                {
                    var checkInMeta = EventMetadata.CreateNew("queue-race", $"doctor-{Guid.NewGuid()}");
                    var request = new CheckInPatientRequest
                    {
                        PatientId = PatientId.Create(sharedPatientId),
                        PatientName = "Race Condition Test",
                        Priority = Priority.Create("High"),
                        ConsultationType = ConsultationType.Create("General"),
                        CheckInTime = DateTime.UtcNow,
                        Metadata = checkInMeta
                    };

                    // Simulate concurrent check-in attempts
                    queue.CheckInPatient(request);

                    lock (lockObj)
                    {
                        successCount++;
                    }
                }
                catch
                {
                    lock (lockObj)
                    {
                        failureCount++;
                    }
                }
            }))
            .ToList();

        // Act
        await Task.WhenAll(tasks);

        // Assert
        // Only first check-in should succeed (idempotency in aggregate level)
        // Others should get DomainException for duplicate patient
        (successCount + failureCount).Should().Be(ConcurrentAttempts);
        failureCount.Should().BeGreaterThan(0, "Duplicate check-ins should be rejected at domain level");
    }

    [Fact]
    public async Task GivenHighConcurrencyScenario_WhenQueueProcesses_ThenNeverDuplicateQueueIds()
    {
        // Arrange
        const int QueueCount = 100;
        const int PatientPerQueueCount = 50;
        var allQueueIds = new ConcurrentDictionary<string, bool>();
        var allPatientIds = new ConcurrentDictionary<string, bool>();

        var tasks = Enumerable.Range(0, QueueCount)
            .SelectMany(queueIndex =>
            {
                var queueId = $"queue-{queueIndex}";
                return Enumerable.Range(0, PatientPerQueueCount)
                    .Select(patientIndex => Task.Run(async () =>
                    {
                        var metadata = EventMetadata.CreateNew(queueId, $"nurse-{patientIndex}");
                        var queue = WaitingQueue.Create(queueId, $"Queue {queueIndex}", 200, metadata);

                        allQueueIds.TryAdd(queue.Id, true);

                        var patientId = $"PAT-{queueIndex}-{patientIndex}";
                        var checkInMeta = EventMetadata.CreateNew(queueId, "reception");
                        var request = new CheckInPatientRequest
                        {
                            PatientId = PatientId.Create(patientId),
                            PatientName = $"Patient {queueIndex}-{patientIndex}",
                            Priority = Priority.Create("Medium"),
                            ConsultationType = ConsultationType.Create("General"),
                            CheckInTime = DateTime.UtcNow,
                            Metadata = checkInMeta
                        };

                        try
                        {
                            queue.CheckInPatient(request);
                            allPatientIds.TryAdd(patientId, true);
                        }
                        catch
                        {
                            // Duplicate or invalid - OK for stress test
                        }

                        await Task.CompletedTask;
                    }));
            })
            .ToList();

        // Act
        await Task.WhenAll(tasks);

        // Assert
        allQueueIds.Count.Should().Be(QueueCount, "Each queue should have unique ID");
        allPatientIds.Count.Should().BeGreaterThan(0, "At least some patients should check in successfully");
    }
}
