namespace WaitingRoom.Application.CommandHandlers;

using MediatR;
using BuildingBlocks.EventSourcing;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Ports;
using WaitingRoom.Domain.Aggregates;

public sealed class ArriveCashierCommandHandler : IRequestHandler<ArriveCashierCommand, ArriveCashierResponse>
{
    private readonly IPatientRepository _patientRepository;

    public ArriveCashierCommandHandler(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository ?? throw new ArgumentNullException(nameof(patientRepository));
    }

    public async Task<ArriveCashierResponse> Handle(ArriveCashierCommand command, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(command.PatientId, cancellationToken);
        if (patient == null)
        {
            return new ArriveCashierResponse { Success = false };
        }

        // Determinar monto (puede venir de una regla de negocio o de la consulta anterior)
        // Por simplicidad en este MVP, usamos un monto fijo o basado en algun criterio.
        // El comando podria traerlo si el frontend lo permite.
        decimal amount = 50.00m; // Monto por defecto para este ejemplo

        var metadata = EventMetadata.CreateNew(
            aggregateId: command.PatientId,
            actor: "Cashier",
            correlationId: command.CorrelationId ?? Guid.NewGuid().ToString());

        patient.ArriveCashier(amount, metadata);

        await _patientRepository.SaveAsync(patient, cancellationToken);

        return new ArriveCashierResponse { Success = true, PaymentAmount = amount };
    }
}
