# Testing

## 1. Purpose

Estrategia de calidad del backend RLAPP. Define la piramide de testing, las herramientas utilizadas, los comandos de ejecucion y los requisitos minimos para nuevos command handlers.

## 2. Context

### Piramide de testing

```
            /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
           /   Integracion (~7)      \
          /   Pipeline E2E, Outbox    \
         /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
        /   Proyecciones (~13)          \
       /  Idempotencia, Replay, Flujo   \
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
     /    Aplicacion (~10)                \
    /   Command Handlers con Mocks        \
   /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
  /      Dominio (~35)                      \
 /  Agregado, Value Objects, Eventos,        \
/   Invariantes                                \
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

| Nivel | Proyecto | Tests estimados | Cobertura conceptual |
|---|---|---|---|
| Dominio | WaitingRoom.Tests.Domain | ~35 | Agregado, value objects, eventos, invariantes |
| Aplicacion | WaitingRoom.Tests.Application | ~10 | Command handlers (CheckIn, flujo de atencion) |
| Proyecciones | WaitingRoom.Tests.Projections | ~13 | Idempotencia, replay, flujo de atencion |
| Integracion | WaitingRoom.Tests.Integration | ~7 | Outbox dispatcher, pipeline E2E |
| **Total** | | **~65** | |

### Herramientas

| Herramienta | Version | Proposito |
|---|---|---|
| xUnit | 2.6.2 - 2.9.3 | Framework de pruebas |
| FluentAssertions | 6.12.0 - 8.8.0 | Aserciones fluidas |
| Moq | 4.20.70 | Mock framework (Application, Integration) |
| NSubstitute | 4.4.0 | Mock framework (Projections) |
| coverlet.collector | 6.0.4 | Cobertura de codigo |
| Microsoft.NET.Test.Sdk | 17.8.0 - 17.14.1 | SDK de pruebas |

## 3. Technical Details

### Tests de dominio

Framework: xUnit + FluentAssertions (8.8.0). Cero dependencias de infraestructura.

| Archivo | Tests | Validacion |
|---|---|---|
| `WaitingQueueTests.cs` | 12 | Creacion de cola, check-in valido e invalido, capacidad, duplicados (case-insensitive), orden de pacientes, limpieza de eventos, determinismo |
| `WaitingQueueAttentionFlowTests.cs` | 12 | Flujo completo: check-in, taquilla, pago, consulta, finalizacion. Ausencias, cancelaciones, prioridad en claim, activacion/desactivacion de consultorios |
| `WaitingQueueCheckInPatientAfterRefactoringTests.cs` | 10 | Validacion del patron Parameter Object (`CheckInPatientRequest`). Retrocompatibilidad tras refactorizacion |
| `PatientCheckedInTests.cs` | 6 | Evento `PatientCheckedIn`: creacion, inmutabilidad (with), metadata, determinismo |
| `PriorityTests.cs` | 7 | Value object `Priority`: valores validos, invalidos, vacios, nulos, whitespace, trim, comparacion de niveles |
| `PatientIdTests.cs` | 7 | Value object `PatientId`: creacion, trim, vacio, whitespace, nulo, igualdad semantica |
| `ConsultationTypeTests.cs` | 5 | Value object `ConsultationType`: creacion, vacio, muy corto, muy largo, trim |
| `UnitTest1.cs` | 1 (vacio) | Test placeholder sin aserciones |

Patrones: AAA (Arrange-Act-Assert), factory methods, cobertura de caminos negativos, tests de determinismo, tests de inmutabilidad de records.

### Tests de aplicacion

Framework: xUnit + FluentAssertions (8.8.0) + Moq (4.20.70). Mocks de `IEventStore`, `IEventPublisher`. `FakeClock` para determinismo temporal.

| Archivo | Tests | Validacion |
|---|---|---|
| `CheckInPatientCommandHandlerTests.cs` | 7 | Handler de check-in: happy path, queue no encontrada (bootstrap), capacidad excedida, conflicto de concurrencia, idempotencia, correlacion, publicacion de eventos |
| `AttentionWorkflowCommandHandlersTests.cs` | 3 | Flujo cashier, payment, claim, call, complete a nivel de command handlers con mocks de infraestructura |

Patrones: `FakeClock`, verificacion de interacciones con `Mock.Verify()`, callbacks en mocks, cobertura de excepciones (`DomainException`, `EventConflictException`).

### Tests de proyecciones

Framework: xUnit + FluentAssertions (6.12.0) + NSubstitute (4.4.0). Uso real de `InMemoryWaitingRoomProjectionContext` (no mocks).

| Archivo | Tests | Validacion |
|---|---|---|
| `PatientCheckedInIdempotencyTests.cs` | 6 | Idempotencia del handler: mismo evento 2x/3x produce estado identico. Prioridad alta/normal. Orden por prioridad. No duplica paciente |
| `ProjectionReplayTests.cs` | 3 | Determinismo: rebuild produce estado identico a procesamiento incremental. Orden de eventos diferente produce mismo estado final. Stream de 100 eventos con replay determinista |
| `AttentionWorkflowProjectionTests.cs` | 1 | Flujo completo de proyeccion: check-in, cashier, payment, claim, call, complete. Valida `NextTurnView` e historial de atenciones |

Patrones: validacion de proyecciones idempotentes con multiples ejecuciones, tests de replay, tests de ordering.

### Tests de integracion

Framework: xUnit + FluentAssertions (6.12.0) + Moq (4.20.70). `FakeOutboxStore`, `MockProjection`. PostgreSQL real (opcional).

| Archivo | Tests | Validacion |
|---|---|---|
| `OutboxDispatcherTests.cs` | 6 | Dispatcher del outbox: sin mensajes, publicacion exitosa, fallos de publicacion, reintentos excedidos, multiples mensajes, fallo parcial |
| `EventDrivenPipelineE2ETests.cs` | 6 | Pipeline E2E completo: check-in, event store, outbox, proyeccion, lag tracking. Idempotencia, estadisticas de lag, eventos lentos, flujo clinico completo, escenario de carga (24 pacientes, 2 recepciones, 4 consultorios, 1 taquilla) |

Patrones: `FakeOutboxStore` in-memory, `TestDomainEvent`, `IAsyncLifetime`, `ExecuteWithConcurrencyRetryAsync`, `CollectionBehavior(DisableTestParallelization = true)`, tests de carga con concurrencia.

### Comandos de ejecucion

```bash
# Tests unitarios de dominio (sin infraestructura)
dotnet test src/Tests/WaitingRoom.Tests.Domain/

# Tests unitarios de aplicacion (sin infraestructura)
dotnet test src/Tests/WaitingRoom.Tests.Application/

# Tests de proyecciones (sin infraestructura)
dotnet test src/Tests/WaitingRoom.Tests.Projections/

# Tests de integracion (requiere PostgreSQL)
dotnet test src/Tests/WaitingRoom.Tests.Integration/

# Todos los tests
dotnet test RLAPP.slnx

# Ciclo completo (cleanup + build + test + deploy)
./run-complete-test.sh
```

### Requisitos minimos para nuevos command handlers

Cada nuevo command handler debe incluir los siguientes tests unitarios:

1. **Happy path**: Ejecucion exitosa del comando con verificacion de eventos generados y estado resultante del agregado.
2. **Agregado no encontrado**: Verificar comportamiento cuando `IEventStore.LoadAsync` no encuentra el agregado (bootstrap o excepcion segun el caso).
3. **Conflicto de concurrencia**: Verificar que `EventConflictException` se propaga cuando la version del agregado no coincide.
4. **Violacion de invariante**: Verificar que `DomainException` se lanza cuando se viola una precondicion de dominio (estado invalido, capacidad excedida, etc.).
5. **Idempotencia**: Verificar que la operacion es idempotente cuando se recibe el mismo `IdempotencyKey`.
6. **Correlacion**: Verificar que el `CorrelationId` se propaga desde el comando hacia los eventos generados.
7. **Publicacion de eventos**: Verificar que `IEventPublisher.PublishAsync` se invoca con los eventos generados.

Estructura de test requerida:

```csharp
public class [NombreHandler]Tests
{
    // Dependencias (mocks)
    private readonly Mock<IEventStore> _eventStoreMock;
    private readonly Mock<IEventPublisher> _eventPublisherMock;
    private readonly IClock _fakeClock;

    // Sujeto bajo prueba
    private readonly [NombreHandler] _handler;

    // Tests obligatorios:
    // 1. Should_[Accion]_When_[Condicion]
    // 2. Should_ThrowDomainException_When_[Invariante]
    // 3. Should_ThrowEventConflictException_When_VersionMismatch
    // 4. Should_BeIdempotent_When_SameIdempotencyKey
    // 5. Should_PropagateCor relationId
    // 6. Should_PublishEvents_When_Success
}
```

## 4. Operational / Maintenance Notes

### Requisitos de infraestructura por nivel

| Nivel | Infraestructura requerida |
|---|---|
| Dominio | Ninguna |
| Aplicacion | Ninguna |
| Proyecciones | Ninguna |
| Integracion | PostgreSQL |

### Base de datos de testing

Base de datos `rlapp_waitingroom_test`: replica exacta del esquema de `rlapp_waitingroom` para tests de integracion.
