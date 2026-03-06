namespace WaitingRoom.Infrastructure.Messaging;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Interfaz para upgraders de esquema de eventos.
///
/// Cuando la estructura de un evento evoluciona, se implementa un upgrader que
/// transforma el payload de la versión anterior a la versión actual.
///
/// Ejemplo de uso:
/// - PatientCheckedIn v1 → v2 (se agrega campo "InsuranceProvider")
/// - Se implementa PatientCheckedInUpgraderV1ToV2
/// - El consumidor detecta schema_version=1 en el header y aplica el upgrader
///
/// // HUMAN CHECK: Los upgraders deben ser idempotentes y no tener efectos secundarios.
/// // Deben funcionar correctamente tanto con eventos nuevos como con eventos históricos
/// // del Event Store al hacer replay para reconstruir proyecciones.
/// </summary>
public interface IEventUpgrader
{
    /// <summary>
    /// Nombre del tipo de evento que este upgrader maneja.
    /// </summary>
    string EventName { get; }

    /// <summary>
    /// Versión de origen que este upgrader acepta como entrada.
    /// </summary>
    int FromVersion { get; }

    /// <summary>
    /// Versión de destino que este upgrader produce como salida.
    /// </summary>
    int ToVersion { get; }

    /// <summary>
    /// Transforma el evento de la versión de origen a la versión de destino.
    /// </summary>
    /// <param name="event">Evento en la versión de origen.</param>
    /// <returns>Evento transformado a la versión de destino.</returns>
    DomainEvent Upgrade(DomainEvent @event);
}
