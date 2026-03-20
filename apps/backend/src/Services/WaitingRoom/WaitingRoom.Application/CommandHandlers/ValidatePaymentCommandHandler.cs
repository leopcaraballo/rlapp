namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;
using WaitingRoom.Domain.Commands;
using WaitingRoom.Domain.ValueObjects;
using System.Linq;

public sealed class ValidatePaymentCommandHandler : IRequestHandler<ValidatePaymentCommand, ValidatePaymentResponse>
{
    private readonly IPatientRepository _patientRepository;
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public ValidatePaymentCommandHandler(
        IPatientRepository patientRepository,
        IEventStore eventStore,
        IEventPublisher eventPublisher,
        IClock clock)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
        _eventStore = eventStore ?? throw new ArgumentNullException(nameof(eventStore));
        _eventPublisher = eventPublisher ?? throw new ArgumentNullException(nameof(eventPublisher));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<ValidatePaymentResponse> Handle(ValidatePaymentCommand command, CancellationToken cancellationToken)
    {
        // 1. Update Patient Aggregate (Legacy/Patient-specific)
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);
        if (patient != null)
        {
            var patientMetadata = EventMetadata.CreateNew(
                aggregateId: command.PatientId,
                actor: command.Actor,
                correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

            patient.ValidatePayment(patientMetadata);
            await _patientRepository.SaveAsync(patient, cancellationToken);
        }

        // 2. Update WaitingQueue Aggregate (Flow Orchestrator)
        var queue = await _eventStore.LoadAsync<WaitingQueue>(command.ServiceId, cancellationToken);
        if (queue == null)
        {
            return new ValidatePaymentResponse { Success = false };
        }

        var queueMetadata = EventMetadata.CreateNew(
            aggregateId: command.ServiceId,
            actor: command.Actor,
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        var request = new ValidatePaymentRequest
        {
            PatientId = PatientId.Create(command.PatientId),
            ValidatedAt = _clock.UtcNow,
            Metadata = queueMetadata
        };

        queue.ValidatePayment(request);

        var eventsToPublish = queue.UncommittedEvents.ToList();
        await _eventStore.SaveAsync(queue, cancellationToken);

        if (eventsToPublish.Count > 0)
        {
            await _eventPublisher.PublishAsync(eventsToPublish, cancellationToken);
        }

        return new ValidatePaymentResponse { Success = true };
    }
}
