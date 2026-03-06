namespace WaitingRoom.Infrastructure.Messaging;

/// <summary>
/// Registro centralizado de versiones de esquema para eventos de dominio.
///
/// Proporciona el mapping entre tipos de evento y su versión de esquema actual.
/// Cuando un evento evoluciona (se agregan/eliminan/renombran campos), la versión
/// debe incrementarse en este registro.
///
/// Flujo de versionamiento:
/// 1. Se necesita cambiar la estructura de un evento
/// 2. Se incrementa la versión aquí
/// 3. Se implementa un IEventUpgrader para la migración
/// 4. Los consumidores leen el header "x-schema-version" y aplican el upgrader si es necesario
///
/// // HUMAN CHECK: Cada vez que se modifique la estructura de un evento de dominio,
/// // se DEBE incrementar la versión en este registro Y crear el upgrader correspondiente.
/// // Nunca modificar un evento sin actualizar la versión — esto rompe la deserialización
/// // de eventos históricos en el Event Store.
/// </summary>
public static class EventSchemaRegistry
{
    /// <summary>
    /// Versión por defecto para eventos sin registro explícito.
    /// </summary>
    public const int DefaultVersion = 1;

    /// <summary>
    /// Mapa de versiones de esquema por nombre de evento.
    /// Las claves son los nombres de tipo del evento (EventName).
    /// </summary>
    private static readonly Dictionary<string, int> SchemaVersions = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── Eventos de Check-In ────────────────────────
        ["PatientCheckedIn"] = 1,
        ["WaitingQueueCreated"] = 1,

        // ── Eventos de Caja ────────────────────────────
        ["PatientCalledAtCashier"] = 1,
        ["PatientPaymentValidated"] = 1,
        ["PatientPaymentPending"] = 1,
        ["PatientAbsentAtCashier"] = 1,
        ["PatientCancelledByPayment"] = 1,

        // ── Eventos de Consulta ────────────────────────
        ["ConsultingRoomActivated"] = 1,
        ["ConsultingRoomDeactivated"] = 1,
        ["PatientClaimedForAttention"] = 1,
        ["PatientCalled"] = 1,
        ["PatientAttentionCompleted"] = 1,
        ["PatientAbsentAtConsultation"] = 1,

        // ── Eventos de Cancelación ─────────────────────
        ["PatientCancelledByAbsence"] = 1,
    };

    /// <summary>
    /// Obtiene la versión del esquema para un tipo de evento.
    /// Retorna <see cref="DefaultVersion"/> si el evento no está registrado.
    /// </summary>
    /// <param name="eventName">Nombre del tipo de evento (case-insensitive).</param>
    /// <returns>Versión del esquema del evento.</returns>
    public static int GetVersion(string eventName)
    {
        return SchemaVersions.TryGetValue(eventName, out var version)
            ? version
            : DefaultVersion;
    }

    /// <summary>
    /// Verifica si un evento tiene una versión registrada explícitamente.
    /// </summary>
    public static bool IsRegistered(string eventName)
    {
        return SchemaVersions.ContainsKey(eventName);
    }

    /// <summary>
    /// Obtiene todos los eventos registrados con sus versiones (para diagnóstico).
    /// </summary>
    public static IReadOnlyDictionary<string, int> GetAllVersions()
    {
        return SchemaVersions.AsReadOnly();
    }
}
