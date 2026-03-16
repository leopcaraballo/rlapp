# Estrategia de Testing — RLAPP

> **Versión:** 1.0.0
> **Última actualización:** 2026-03-10
> **Responsable:** Equipo de desarrollo RLAPP

---

## 1. Resumen ejecutivo

Este documento define la estrategia integral de testing para el proyecto RLAPP (Sistema de Gestión de Sala de Espera Clínica). La estrategia abarca desde pruebas unitarias de dominio hasta pruebas end-to-end de infraestructura, garantizando la calidad del software en todos los niveles de la pirámide de testing.

**Objetivo de cobertura:** >= 80% en todas las capas.

**Total de pruebas actuales:** 183 (91 Domain + 12 Application + 11 Projections + 69 Integration).

---

## 2. Pirámide de testing

```
         /  E2E (HTTP)  \          ← 37 pruebas (FullClinicalFlow + EndpointValidation)
        / Integracion    \         ← 32 pruebas (RabbitMQ, Serialization, Pipeline)
       /  Aplicacion      \        ← 12 pruebas (CommandHandlers, Validators)
      /   Dominio (Unit)   \       ← 91 pruebas (Aggregates, ValueObjects, Events)
     /     Proyecciones     \      ← 11 pruebas (Worker, Subscriber, ProjectionStore)
    /_________________________\
```

### 2.1. Pruebas de dominio (unitarias)

| Aspecto | Detalle |
| --- | --- |
| Proyecto | `WaitingRoom.Tests.Domain` |
| Framework | xUnit 2.9.x + FluentAssertions 8.x |
| Cobertura | Aggregates, Value Objects, Domain Events, Guards |
| Patron | Given-When-Then (Arrange-Act-Assert) |
| Total | 91 pruebas |
| Tiempo ejecucion | < 5 segundos |

**Convenciones de nombrado:**

```
[MetodoOClase]_[Escenario]_[ResultadoEsperado]
```

Ejemplo: `RegisterPatient_WithValidData_ShouldEmitPatientRegisteredEvent`

### 2.2. Pruebas de aplicacion

| Aspecto | Detalle |
| --- | --- |
| Proyecto | `WaitingRoom.Tests.Application` |
| Framework | xUnit + NSubstitute 4.4.0 + FluentAssertions |
| Cobertura | Command Handlers, Query Handlers, Validators |
| Patron | Mocks para repositorios y servicios externos |
| Total | 12 pruebas |

### 2.3. Pruebas de proyecciones

| Aspecto | Detalle |
| --- | --- |
| Proyecto | `WaitingRoom.Tests.Projections` |
| Framework | xUnit + Moq 4.20.70 + FluentAssertions |
| Cobertura | ProjectionWorker, RabbitMqProjectionEventSubscriber, ProjectionStore |
| Patron | Mocks para IConnection, IModel, IProjectionStore |
| Total | 11 pruebas |

### 2.4. Pruebas de integracion

| Aspecto | Detalle |
| --- | --- |
| Proyecto | `WaitingRoom.Tests.Integration` |
| Framework | xUnit + Microsoft.AspNetCore.Mvc.Testing |
| Cobertura | HTTP endpoints, middleware, pipeline completo |
| Patron | `WebApplicationFactory<Program>` con fakes in-memory |
| Total | 69 pruebas |

**Subcategorias:**

- **E2E HTTP (37):** Flujo clinico completo, validaciones de endpoints, roles, idempotencia.
- **RabbitMQ Integration (10):** Publisher con connection pooling, retry, dead-letter.
- **Event Serialization (23):** Roundtrip de 14 tipos de eventos con metadatos.

---

## 3. Infraestructura de testing

### 3.1. Fakes y dobles de prueba

| Fake | Reemplaza | Ubicacion |
| --- | --- | --- |
| `FakeEventStore` | `IEventStore` | Tests.Integration/Fakes/ |
| `FakeOutboxStore` | `IOutboxStore` | Tests.Integration/Fakes/ |
| `FakeIdempotencyStore` | `IIdempotencyStore` | Tests.Integration/Fakes/ |
| `FakeRabbitMqPublisher` | `IRabbitMqEventPublisher` | Tests.Integration/Fakes/ |
| `FakeIdentityRegistry` | `IIdentityRegistry` | Tests.Integration/Fakes/ |

### 3.2. WebApplicationFactory

```csharp
// WaitingRoomApiFactory configura:
// 1. Servicios fake in-memory (DI override)
// 2. Autenticacion bypass (TestAuthHandler)
// 3. Healthchecks deshabilitados para tests
// 4. Logging a ITestOutputHelper
```

### 3.3. Configuracion de cobertura

- **Herramienta:** coverlet.collector 6.0.4
- **Formato:** Cobertura XML + opencover
- **Umbral minimo:** 80%
- **Comando:** `./run-coverage.sh` o `dotnet test --collect:"XPlat Code Coverage"`
- **Configuracion:** `coverage.runsettings`

---

## 4. Ejecucion de pruebas

### 4.1. Comandos principales

```bash
# Todas las pruebas (183)
cd apps/backend && dotnet test RLAPP.slnx --configuration Release

# Solo dominio (91 pruebas, < 5s)
dotnet test src/Tests/WaitingRoom.Tests.Domain/

# Solo aplicacion (12 pruebas)
dotnet test src/Tests/WaitingRoom.Tests.Application/

# Solo proyecciones (11 pruebas)
dotnet test src/Tests/WaitingRoom.Tests.Projections/

# Solo integracion (69 pruebas)
dotnet test src/Tests/WaitingRoom.Tests.Integration/

# Con detalle por proyecto
./run-tests-detail.sh

# Solo unitarias sin build
./run-tests-detail.sh --domain --application --projections --no-build

# Con cobertura
./run-coverage.sh
```

### 4.2. Ejecucion en CI/CD

El pipeline de CI (`.github/workflows/ci.yml`) ejecuta automaticamente:

1. `dotnet test` con configuracion Release en cada push/PR.
2. Cobertura reportada como artefacto de CI.
3. Pruebas de frontend via `npm test -- --runInBand`.

### 4.3. Ejecucion en Docker

```bash
# Usando el overlay de CI
docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d
# Ejecutar pruebas contra servicios reales
dotnet test --filter Category=Integration
```

---

## 5. Criterios de calidad

### 5.1. Definition of Done para pruebas

- [ ] Cada command handler tiene al menos 2 pruebas (happy path + error path).
- [ ] Cada aggregate tiene pruebas para todas las transiciones de estado.
- [ ] Cada Value Object tiene pruebas de validacion y equidad.
- [ ] Los endpoints HTTP tienen pruebas de autorizacion por rol.
- [ ] Los endpoints HTTP validan el header `Idempotency-Key`.
- [ ] Las pruebas de integracion cubren el flujo clinico completo.

### 5.2. Metricas objetivo

| Metrica | Objetivo | Actual |
| --- | --- | --- |
| Cobertura de lineas | >= 80% | ~82% |
| Cobertura de ramas | >= 75% | ~78% |
| Pruebas totales | >= 150 | 183 |
| Tiempo total ejecucion | < 60s | ~45s |
| Pruebas fallidas permitidas | 0 | 0 |

---

## 6. Patrones de testing aplicados

### 6.1. Given-When-Then (dominio)

```csharp
[Fact]
public void RegisterPatient_WithValidData_ShouldEmitEvent()
{
    // Given: Un agregado en estado inicial
    var queue = WaitingQueue.Create(queueId, date, speciality);

    // When: Se registra un paciente
    queue.RegisterPatient(patientId, name, document);

    // Then: Se emite PatientRegisteredEvent
    queue.UncommittedEvents.Should().ContainSingle()
        .Which.Should().BeOfType<PatientRegisteredEvent>();
}
```

### 6.2. Mocks con NSubstitute (aplicacion)

```csharp
[Fact]
public async Task Handle_ValidCommand_ShouldPersistEvents()
{
    // Arrange
    var repository = Substitute.For<IEventStore>();
    var handler = new RegisterPatientHandler(repository);

    // Act
    await handler.Handle(command, CancellationToken.None);

    // Assert
    await repository.Received(1).SaveEventsAsync(Arg.Any<...>());
}
```

### 6.3. Integration con WebApplicationFactory

```csharp
[Fact]
public async Task PostRegisterPatient_ShouldReturn200_WithCorrelationId()
{
    // Arrange
    var client = _factory.CreateClient();
    client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
    client.DefaultRequestHeaders.Add("X-User-Role", "Receptionist");

    // Act
    var response = await client.PostAsJsonAsync("/api/reception/register", payload);

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    body.GetProperty("correlationId").GetString().Should().NotBeNullOrEmpty();
}
```

---

## 7. Mantenimiento y evolucion

### 7.1. Cuando agregar nuevas pruebas

- Al crear un nuevo Command/Query handler.
- Al agregar un nuevo endpoint HTTP.
- Al modificar reglas de negocio en aggregates.
- Al corregir un bug (primero escribir la prueba que lo reproduce).

### 7.2. Revision periodica

- **Semanal:** Verificar que todas las pruebas pasan en CI.
- **Mensual:** Revisar metricas de cobertura y agregar pruebas donde falten.
- **Por sprint:** Actualizar este documento si cambia la estrategia.

---

## 8. Herramientas y dependencias

| Herramienta | Version | Proposito |
| --- | --- | --- |
| xUnit | 2.6.2 / 2.9.x | Framework de pruebas |
| FluentAssertions | 6.12 / 8.8 | Aserciones expresivas |
| NSubstitute | 4.4.0 | Mocks (Application layer) |
| Moq | 4.20.70 | Mocks (Projections layer) |
| coverlet.collector | 6.0.4 | Cobertura de codigo |
| Microsoft.AspNetCore.Mvc.Testing | 10.0.0 | Tests de integracion HTTP |
| Microsoft.NET.Test.Sdk | 17.12.0 | SDK de pruebas .NET |
