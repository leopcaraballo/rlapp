namespace WaitingRoom.Infrastructure.Messaging;

using BuildingBlocks.EventSourcing;
using Microsoft.Extensions.Logging;

/// <summary>
/// Cadena de upgraders para evolución de esquemas de eventos.
///
/// Aplica upgraders secuencialmente para migrar un evento desde
/// cualquier versión anterior a la versión actual.
///
/// Patrón: Chain of Responsibility
/// - Cada upgrader maneja una transición de versión (v1→v2, v2→v3, etc.)
/// - La cadena se aplica automáticamente hasta alcanzar la versión actual
///
/// // HUMAN CHECK: Garantizar que la cadena de upgraders sea completa.
/// // Si falta un eslabón (ej: v2→v3 cuando existe v1→v2 y v3→v4),
/// // el evento quedará en una versión intermedia sin advertencia silenciosa.
/// </summary>
public sealed class EventUpgraderChain
{
    private readonly Dictionary<string, SortedList<int, IEventUpgrader>> _upgraders = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<EventUpgraderChain> _logger;

    public EventUpgraderChain(
        IEnumerable<IEventUpgrader> upgraders,
        ILogger<EventUpgraderChain> logger)
    {
        ArgumentNullException.ThrowIfNull(upgraders);
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        foreach (var upgrader in upgraders)
        {
            if (!_upgraders.ContainsKey(upgrader.EventName))
            {
                _upgraders[upgrader.EventName] = new SortedList<int, IEventUpgrader>();
            }

            _upgraders[upgrader.EventName][upgrader.FromVersion] = upgrader;
        }
    }

    /// <summary>
    /// Aplica la cadena de upgrades necesarios para llevar el evento a la versión actual.
    /// </summary>
    /// <param name="event">Evento potencialmente en una versión anterior.</param>
    /// <param name="currentSchemaVersion">Versión actual del esquema según el EventSchemaRegistry.</param>
    /// <returns>Evento en la versión actual (o sin cambios si ya está actualizado).</returns>
    public DomainEvent UpgradeToCurrentVersion(DomainEvent @event, int currentSchemaVersion)
    {
        var eventVersion = @event.Metadata.SchemaVersion;

        if (eventVersion >= currentSchemaVersion)
        {
            return @event;
        }

        if (!_upgraders.TryGetValue(@event.EventName, out var chain))
        {
            _logger.LogWarning(
                "No hay upgraders registrados para {EventName} v{From} → v{To}. Retornando evento sin modificar.",
                @event.EventName,
                eventVersion,
                currentSchemaVersion);

            return @event;
        }

        var current = @event;

        for (var version = eventVersion; version < currentSchemaVersion; version++)
        {
            if (!chain.TryGetValue(version, out var upgrader))
            {
                _logger.LogWarning(
                    "Eslabón faltante en la cadena de upgrade: {EventName} v{Version} → v{Next}. " +
                    "Retornando evento parcialmente actualizado en v{Current}.",
                    @event.EventName,
                    version,
                    version + 1,
                    version);

                break;
            }

            _logger.LogDebug(
                "Aplicando upgrade {EventName} v{From} → v{To}",
                upgrader.EventName,
                upgrader.FromVersion,
                upgrader.ToVersion);

            current = upgrader.Upgrade(current);
        }

        return current;
    }

    /// <summary>
    /// Verifica si existen upgraders registrados para un tipo de evento.
    /// </summary>
    public bool HasUpgraders(string eventName)
    {
        return _upgraders.ContainsKey(eventName) && _upgraders[eventName].Count > 0;
    }
}
