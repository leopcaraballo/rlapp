namespace WaitingRoom.Domain.Invariants;

using Exceptions;

/// <summary>
/// Domain invariants for the WaitingRoom aggregate.
/// These rules must always be true and are enforced by the aggregate.
///
/// Invariants:
/// 1. Queue cannot exceed maximum capacity
/// 2. Patient cannot check in twice
/// 3. Queue must maintain patient list order
/// 4. Priority must be valid
/// </summary>
public static class WaitingQueueInvariants
{
    /// <summary>
    /// Validates that queue hasn't reached capacity.
    /// </summary>
    public static void ValidateCapacity(int currentCount, int maxCapacity)
    {
        if (currentCount >= maxCapacity)
            throw new DomainException(
                $"Queue is at maximum capacity ({maxCapacity}). Cannot add more patients.");
    }

    /// <summary>
    /// Validates that patient is not already in queue.
    /// </summary>
    public static void ValidateDuplicateCheckIn(
        string patientId,
        IEnumerable<string> queuedPatientIds)
    {
        if (queuedPatientIds.Contains(patientId))
            throw new DomainException(
                $"Patient {patientId} is already in the queue.");
    }

    /// <summary>
    /// Validates priority is valid (done at value object level, but enforced here too).
    /// </summary>
    public static void ValidatePriority(string priority)
    {
        var validPriorities = new[] { "low", "medium", "high", "urgent" };
        var normalized = priority.Trim().ToLowerInvariant();

        if (!validPriorities.Contains(normalized))
            throw new DomainException($"Invalid priority: {priority}");
    }

    /// <summary>
    /// Validates queue name is not empty.
    /// </summary>
    public static void ValidateQueueName(string queueName)
    {
        if (string.IsNullOrWhiteSpace(queueName))
            throw new DomainException("Queue name cannot be empty");
    }
}
