namespace WaitingRoom.Infrastructure.Messaging;

using Microsoft.Extensions.Logging;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using RabbitMQ.Client.Exceptions;

/// <summary>
/// Proveedor centralizado del pipeline de resiliencia para operaciones RabbitMQ.
///
/// Implementa dos estrategias complementarias:
/// 1. Retry con backoff exponencial + jitter para fallos transitorios
/// 2. Circuit Breaker para proteger contra cascadas de fallos
///
/// Diseño:
/// - Singleton: el pipeline se construye una sola vez y se reutiliza
/// - Thread-safe: Polly v8 garantiza seguridad en concurrencia
/// - Observable: todos los eventos se registran via ILogger
///
/// // HUMAN CHECK: Verificar que las excepciones manejadas cubren todos los modos
/// // de fallo observados en producción. Agregar excepciones adicionales si surgen
/// // fallos no capturados en los logs de Serilog/Prometheus.
/// </summary>
public sealed class RabbitMqResiliencePipeline
{
    private readonly ResiliencePipeline _pipeline;

    public RabbitMqResiliencePipeline(
        RabbitMqResilienceOptions options,
        ILogger<RabbitMqResiliencePipeline> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(logger);

        _pipeline = new ResiliencePipelineBuilder()
            .AddRetry(BuildRetryOptions(options, logger))
            .AddCircuitBreaker(BuildCircuitBreakerOptions(options, logger))
            .Build();
    }

    /// <summary>
    /// Pipeline de resiliencia pre-construido (inmutable, thread-safe).
    /// </summary>
    public ResiliencePipeline Pipeline => _pipeline;

    // ── Configuración de Retry ─────────────────────────────

    private static RetryStrategyOptions BuildRetryOptions(
        RabbitMqResilienceOptions options,
        ILogger logger)
    {
        return new RetryStrategyOptions
        {
            MaxRetryAttempts = options.MaxRetryAttempts,
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
            Delay = TimeSpan.FromMilliseconds(options.BaseDelayMs),
            MaxDelay = TimeSpan.FromSeconds(options.MaxDelaySeconds),
            ShouldHandle = new PredicateBuilder()
                .Handle<BrokerUnreachableException>()
                .Handle<AlreadyClosedException>()
                .Handle<OperationInterruptedException>()
                .Handle<TimeoutException>(),
            OnRetry = args =>
            {
                logger.LogWarning(
                    "RabbitMQ retry {AttemptNumber}/{MaxAttempts} después de {Delay}ms — Excepción: {ExceptionType}: {Message}",
                    args.AttemptNumber + 1,
                    options.MaxRetryAttempts,
                    args.RetryDelay.TotalMilliseconds,
                    args.Outcome.Exception?.GetType().Name ?? "N/A",
                    args.Outcome.Exception?.Message ?? "Sin excepción");

                return ValueTask.CompletedTask;
            }
        };
    }

    // ── Configuración de Circuit Breaker ───────────────────

    private static CircuitBreakerStrategyOptions BuildCircuitBreakerOptions(
        RabbitMqResilienceOptions options,
        ILogger logger)
    {
        return new CircuitBreakerStrategyOptions
        {
            FailureRatio = options.FailureRatio,
            SamplingDuration = TimeSpan.FromSeconds(options.SamplingDurationSeconds),
            MinimumThroughput = options.MinimumThroughput,
            BreakDuration = TimeSpan.FromSeconds(options.BreakDurationSeconds),
            ShouldHandle = new PredicateBuilder()
                .Handle<BrokerUnreachableException>()
                .Handle<AlreadyClosedException>()
                .Handle<OperationInterruptedException>()
                .Handle<TimeoutException>(),
            OnOpened = args =>
            {
                logger.LogError(
                    "Circuit Breaker ABIERTO para RabbitMQ — se mantendrá abierto {BreakDuration}s. " +
                    "Última excepción: {ExceptionType}: {Message}",
                    options.BreakDurationSeconds,
                    args.Outcome.Exception?.GetType().Name ?? "N/A",
                    args.Outcome.Exception?.Message ?? "Sin excepción");

                return ValueTask.CompletedTask;
            },
            OnClosed = _ =>
            {
                logger.LogInformation(
                    "Circuit Breaker CERRADO para RabbitMQ — operación normal restaurada");

                return ValueTask.CompletedTask;
            },
            OnHalfOpened = _ =>
            {
                logger.LogWarning(
                    "Circuit Breaker SEMI-ABIERTO para RabbitMQ — ejecutando intento de prueba");

                return ValueTask.CompletedTask;
            }
        };
    }
}
