namespace WaitingRoom.Application.Ports;

/// <summary>
/// Port for Patient State read model (PostgreSQL).
/// </summary>
public interface IPatientStateRepository
{
    Task UpsertAsync(PatientStateRow row, CancellationToken ct = default);
    Task<PatientStateRow?> GetByIdAsync(string patientId, CancellationToken ct = default);
    Task<IEnumerable<PatientStateRow>> GetAllWaitingAsync(CancellationToken ct = default);
}

public sealed record PatientStateRow
{
    public required string PatientId { get; init; }
    public required string PatientIdentity { get; init; }
    public required string PatientName { get; init; }
    public required string CurrentState { get; init; }
    public DateTime? WaitingStartedAt { get; init; }
    public string? AssignedRoomId { get; init; }
    public DateTime? ConsultationStartedAt { get; init; }
    public DateTime? ConsultationFinishedAt { get; init; }
    public decimal? PaymentAmount { get; init; }
    public int PaymentAttempts { get; init; }
    public DateTime? PaymentValidatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? LeaveReason { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime LastModifiedAt { get; init; }
    public required long UpdatedByEventVersion { get; init; }
}
