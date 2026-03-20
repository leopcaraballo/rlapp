namespace WaitingRoom.Projections.Abstractions;

using WaitingRoom.Projections.Views;

/// <summary>
/// Extended context for WaitingRoom projections.
///
/// Extends base IProjectionContext with domain-specific query and update methods.
/// This keeps handlers clean and focused on event handling logic.
///
/// Responsibilities:
/// - Update AtencionMonitorView state
/// - Update AtencionStateView state
/// - Query current view state
/// - Manage patient data
/// </summary>
public interface IAtencionProjectionContext : IProjectionContext
{
    /// <summary>
    /// Updates monitor view counters.
    /// Used when patient priority changes or checks in.
    /// </summary>
    /// <param name="serviceId">Queue identifier.</param>
    /// <param name="priority">Priority level (high, normal, low).</param>
    /// <param name="operation">increment or decrement.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task UpdateMonitorViewAsync(
        string serviceId,
        string priority,
        string operation, // "increment" or "decrement"
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds patient to queue state view.
    /// </summary>
    /// <param name="serviceId">Queue identifier.</param>
    /// <param name="patient">Patient data to add.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task AddPatientToQueueAsync(
        string serviceId,
        PatientInQueueDto patient,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes patient from queue state view.
    /// (Called when patient served or removed).
    /// </summary>
    /// <param name="serviceId">Queue identifier.</param>
    /// <param name="patientId">Patient to remove.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task RemovePatientFromQueueAsync(
        string serviceId,
        string patientId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets current state of monitor view.
    /// Used for informational/test purposes.
    /// </summary>
    /// <param name="serviceId">Queue identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Current monitor view or null if not found.</returns>
    Task<AtencionMonitorView?> GetMonitorViewAsync(
        string serviceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets current state of queue view.
    /// Used for queries and test verification.
    /// </summary>
    /// <param name="serviceId">Queue identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Current queue state view.</returns>
    Task<AtencionStateView?> GetQueueStateViewAsync(
        string serviceId,
        CancellationToken cancellationToken = default);

    Task<AtencionFullStateView?> GetFullStateViewAsync(
        string serviceId,
        CancellationToken cancellationToken = default);

    Task<NextTurnView?> GetNextTurnViewAsync(
        string serviceId,
        CancellationToken cancellationToken = default);

    Task SetNextTurnViewAsync(
        string serviceId,
        NextTurnView? view,
        CancellationToken cancellationToken = default);

    Task AddPatientToConsultationAsync(
        string serviceId,
        NextTurnView patient,
        CancellationToken cancellationToken = default);

    Task RemovePatientFromConsultationAsync(
        string serviceId,
        string patientId,
        CancellationToken cancellationToken = default);

    Task AddPatientToPaymentAsync(
        string serviceId,
        NextTurnView patient,
        CancellationToken cancellationToken = default);

    Task RemovePatientFromPaymentAsync(
        string serviceId,
        string patientId,
        CancellationToken cancellationToken = default);

    Task AddRecentAttentionRecordAsync(
        string serviceId,
        RecentAttentionRecordView record,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RecentAttentionRecordView>> GetRecentAttentionHistoryAsync(
        string serviceId,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears all queue-related projection data.
    /// Used during rebuild.
    /// </summary>
    /// <param name="serviceId">Queue to clear.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ClearQueueProjectionAsync(
        string serviceId,
        CancellationToken cancellationToken = default);
}
