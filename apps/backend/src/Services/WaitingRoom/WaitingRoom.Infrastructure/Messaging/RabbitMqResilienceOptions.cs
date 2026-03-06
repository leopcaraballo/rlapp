namespace WaitingRoom.Infrastructure.Messaging;

/// <summary>
/// Opciones de configuración para la política de resiliencia de RabbitMQ.
///
/// Configuración de dos estrategias complementarias:
/// 1. Retry con backoff exponencial para fallos transitorios
/// 2. Circuit Breaker para proteger contra cascadas de fallos
///
/// // HUMAN CHECK: Los valores por defecto están calibrados para un entorno clínico
/// // con alta disponibilidad. Ajustar según SLA del sistema de producción.
/// // BreakDuration y FailureRatio deben alinearse con alertas de Prometheus/Grafana.
/// </summary>
public sealed class RabbitMqResilienceOptions
{
    // ── Retry ──────────────────────────────────────────────

    /// <summary>
    /// Número máximo de reintentos antes de propagar la excepción.
    /// </summary>
    public int MaxRetryAttempts { get; init; } = 3;

    /// <summary>
    /// Retardo base para el backoff exponencial (milisegundos).
    /// </summary>
    public int BaseDelayMs { get; init; } = 500;

    /// <summary>
    /// Retardo máximo permitido entre reintentos (segundos).
    /// </summary>
    public int MaxDelaySeconds { get; init; } = 30;

    // ── Circuit Breaker ────────────────────────────────────

    /// <summary>
    /// Ratio de fallos que activa la apertura del circuito (0.0 - 1.0).
    /// </summary>
    public double FailureRatio { get; init; } = 0.5;

    /// <summary>
    /// Ventana de muestreo para calcular el ratio de fallos (segundos).
    /// </summary>
    public int SamplingDurationSeconds { get; init; } = 30;

    /// <summary>
    /// Número mínimo de ejecuciones en la ventana de muestreo antes de evaluar el ratio.
    /// </summary>
    public int MinimumThroughput { get; init; } = 5;

    /// <summary>
    /// Duración del estado abierto del circuito antes de permitir un intento de prueba (segundos).
    /// </summary>
    public int BreakDurationSeconds { get; init; } = 30;
}
