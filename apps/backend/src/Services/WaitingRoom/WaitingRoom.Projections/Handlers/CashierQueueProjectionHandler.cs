namespace WaitingRoom.Projections.Handlers;

using BuildingBlocks.EventSourcing;
using WaitingRoom.Domain.Events;
using WaitingRoom.Application.Ports;
using WaitingRoom.Projections.Abstractions;

/// <summary>
/// Projection handler for Cashier Queue management.
/// Adds patients to cashier_queue_view when they arrive at cashier,
/// and removes them when payment is validated or they complete the process.
/// </summary>
public sealed class CashierQueueProjectionHandler : IProjectionHandler
{
    private readonly ICashierQueueRepository _cashierRepository;
    private readonly IPatientStateRepository _patientRepository;

    public string EventName => "CashierQueueHandler";

    public CashierQueueProjectionHandler(
        ICashierQueueRepository cashierRepository,
        IPatientStateRepository patientRepository)
    {
        _cashierRepository = cashierRepository ?? throw new ArgumentNullException(nameof(cashierRepository));
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
    }

    public async Task HandleAsync(
        DomainEvent @event,
        IProjectionContext context,
        CancellationToken cancellationToken = default)
    {
        var idempotencyKey = $"cashier-queue:{@event.Metadata.AggregateId}:{@event.Metadata.Version}";

        if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
            return;

        var patientId = @event.Metadata.AggregateId;

        switch (@event)
        {
            case PatientArrivedAtCashier e:
                var patient = await _patientRepository.GetByIdAsync(patientId, cancellationToken);
                if (patient != null)
                {
                    await _cashierRepository.UpsertAsync(new CashierQueueRow
                    {
                        PatientId = patient.PatientId,
                        PatientIdentity = patient.PatientIdentity,
                        PatientName = patient.PatientName,
                        PaymentAmount = e.PaymentAmount,
                        ArrivedAtCashierAt = e.ArrivedAt,
                        PaymentAttempts = 0,
                        UpdatedAt = e.Metadata.OccurredAt,
                        UpdatedByEventVersion = e.Metadata.Version
                    }, cancellationToken);
                }
                break;

            case PatientPaymentValidated _:
            case PatientCompleted _:
            case PatientMarkedAbsentAtCashier _:
                await _cashierRepository.DeleteAsync(patientId, cancellationToken);
                break;
        }

        await context.MarkProcessedAsync(idempotencyKey, cancellationToken);
    }
}
