namespace WaitingRoom.Application.Ports;

/// <summary>
/// Port for Cashier Queue read model (PostgreSQL).
/// </summary>
public interface ICashierQueueRepository
{
    Task UpsertAsync(CashierQueueRow row, CancellationToken ct = default);
    Task DeleteAsync(string patientId, CancellationToken ct = default);
    Task<CashierQueueRow?> GetByIdAsync(string patientId, CancellationToken ct = default);
    Task<IEnumerable<CashierQueueRow>> GetAllAsync(CancellationToken ct = default);
}

public sealed record CashierQueueRow
{
    public required string PatientId { get; init; }
    public required string PatientIdentity { get; init; }
    public required string PatientName { get; init; }
    public required decimal PaymentAmount { get; init; }
    public required DateTime ArrivedAtCashierAt { get; init; }
    public int PaymentAttempts { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required long UpdatedByEventVersion { get; init; }
}
