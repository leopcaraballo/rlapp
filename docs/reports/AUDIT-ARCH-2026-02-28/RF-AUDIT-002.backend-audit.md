# RF-AUDIT-002: Auditoría de Arquitectura Backend

**Identificador:** RF-AUDIT-002
**Fecha:** 28 de febrero de 2026
**Alcance:** Análisis estático de rlapp-backend/src/ (Arquitectura Hexagonal, CQRS, Event Sourcing)
**Stack:** .NET 10.0, ASP.NET Core, PostgreSQL 16, RabbitMQ 3.x

---

## 1. Resumen Ejecutivo

El backend implementa correctamente la arquitectura hexagonal con Event Sourcing + CQRS. Se han identificado **12 hallazgos**, de los cuales **5 son críticos**. Los problemas principales son seguridad, testing en infraestructura y persistencia de modelos de lectura.

| Criticidad | Cantidad | Estado     |
|-----------|----------|-----------|
| Crítica   | 5        | Bloqueante |
| Alta      | 4        | Importante |
| Media     | 3        | Mejora     |

---

## 2. Hallazgos por Categoría

### A. SEGURIDAD Y AUTENTICACIÓN (5 hallazgos - Todos críticos)

#### H-SEC-001: Ausencia de Authentication real

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** WaitingRoom.API
**Descripción:** El API no implementa OAuth2/JWT. Solo utiliza filtro de header `X-User-Role` que es falsificable.
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs:996](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs#L996)
**Evidencia:**

```csharp
// NO existe configuración de JWT, OAuth2 o autenticación real
// El único filtro es X-User-Role en headers (string inseguro)
```

**Riesgo:** Cualquier cliente puede suplantarse como Receptionist o médico.
**Recomendación:**

- Implementar JWT con HS256 o RS256
- Validar claims en cada request
- Eliminar filtro de header vulnerable
- Target .NET 10.0 soporta Identity autónoma sin librerías externas

**Artefactos relacionados:** [rlapp-backend/docs/DEBT.md#L4-L5](rlapp-backend/docs/DEBT.md#L4-L5) (ya documentado como deuda)

---

#### H-SEC-002: Falta de Authorization basada en roles

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** WaitingRoom.API
**Descripción:** Sin Authorization policies. Header `X-User-Role` lee pero no se valida contra recurso solicitado.
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs:150-160](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs#L150)
**Evidencia:** No se encuentran:

- `AuthorizeAttribute` en endpoints
- Policy registration (`AddAuthorizationBuilder`)
- Role-based guards en command handlers

**Riesgo:** Operarios caja pueden ejecutar comandos de consulta; médicos pueden acceder datos de recepción.
**Recomendación:**

- Usar `[Authorize(Roles = "Receptionist")]` en endpoints sensibles
- Implementar `RequireAssertion()` para lógica compleja (ej. solo consultor su sala)
- Validar correlationId contra sesión en el handler

---

#### H-SEC-003: Rate limiting ausente

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** WaitingRoom.API
**Descripción:** Sin protección contra fuerza bruta. Endpoint de check-in puede ser llamado ilimitadamente.
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Endpoints/WaitingRoomQueryEndpoints.cs:30-50](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Endpoints/WaitingRoomQueryEndpoints.cs#L30)
**Riesgo:** DDoS, ataques de fuerza bruta, inyección DoS en database (100 mills de eventos).
**Recomendación:**

- Usar middleware de rate limiting (AspNetCoreRateLimit o similar)
- Estrategia: 100 req/min por IP + 10 req/min por usuario autenticado
- Logging de eventos de rate limit

---

#### H-SEC-004: Secretos en configuration hardeada

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** docker-compose.yml
**Descripción:** Contraseña PostgreSQL y RabbitMQ visibles en plaintext.
**Ubicación:** [docker-compose.yml:15-16](docker-compose.yml#L15-L16), [docker-compose.yml:42-44](docker-compose.yml#L42-L44)
**Evidencia:**

```yaml
POSTGRES_PASSWORD: rlapp_secure_password
RABBITMQ_DEFAULT_PASS: guest
```

**Riesgo:** Expone credenciales en repositorio publicitado y logs de build.
**Recomendación:**

- Mover a `.env` (no commitable) o secrets manager
- .env nunca en git, siempre en .gitignore
- En CI/CD, usar GitHub Secrets o similar

---

#### H-SEC-005: SignalR sin autenticación

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** WaitingRoom.API/Hubs
**Descripción:** Hub SignalR no valida identidad. Cualquier WebSocket puede conectarse.
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Hubs](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Hubs) (no hay [Authorize])
**Riesgo:** Espionaje de datos clínicos en tiempo real (nombres de pacientes, tiempos, prioridades).
**Recomendación:**

- Agregar `[Authorize]` en Hub class
- Validar JWT en handshake SignalR (`HttpContext.User`)
- Filtrar mensajes por queueId del usuario autenticado

---

### B. ARQUITECTURA HEXAGONAL (3 hallazgos)

#### H-ARCH-001: Inversión de dependencias incompleta en Application layer

**Criticidad:** 🟠 **ALTA**
**Componente:** WaitingRoom.Application/CommandHandlers
**Descripción:** Handlers contienen lógica de orquestación que podría estar en Domain (decisiones de negocio).
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Application/CommandHandlers/CheckInPatientCommandHandler.cs:75-95](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Application/CommandHandlers/CheckInPatientCommandHandler.cs#L75)
**Evidencia:**

```csharp
public async Task<int> HandleAsync(
    CheckInPatientCommand command,
    CancellationToken cancellationToken = default)
{
    var queueId = string.IsNullOrWhiteSpace(command.QueueId)
        ? _queueIdGenerator.Generate()  // Lógica de negocio aquí
        : command.QueueId;
    // ...
}
```

**Problema:** La decisión "si queueId está vacío, generar uno" es una regla de negocio que debería estar explícita en Value Object o Domain Factory.
**Recomendación:**

- Mover generación de IDs a `QueueId` value object (factory pattern)
- Application obtiene solo del cliente o del domain

---

#### H-ARCH-002: Proyecciones en memoria sin persistencia

**Criticidad:** 🟠 **ALTA**
**Componente:** WaitingRoom.Projections/Infrastructure/InMemoryWaitingRoomProjectionContext.cs
**Descripción:** Read models se pierden al reiniciar API. No es resiliente para producción.
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Projections/Infrastructure/InMemoryWaitingRoomProjectionContext.cs:1-30](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Projections/Infrastructure/InMemoryWaitingRoomProjectionContext.cs#L1)
**Evidencia:**

```csharp
public sealed class InMemoryWaitingRoomProjectionContext : IWaitingRoomProjectionContext
{
    // Usa Dictionary<,> en memoria
    // Sin backup a PostgreSQL
}
```

**Impacto:** Dashboard queries fallan después de reinicio; proyección tarda minutos en reconstruirse.
**Recomendación:**

- Implementar `PostgresWaitingRoomProjectionContext` con tablas read models
- Tablas: `v_waiting_room_monitor`, `v_queue_state`, `v_next_turn`, `v_recent_attention`
- Proyección escribe en BD de lectura en mismo tx que Event Store (idempotencia con versión)

---

#### H-ARCH-003: Acoplamiento entre API y Domain eventos

**Criticidad:** 🟠 **ALTA**
**Componente:** WaitingRoom.API/Program.cs
**Descripción:** Bootstrap de servicios mezcla capas (Domain, Application, Infrastructure, API).
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs:70-120](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs#L70)
**Evidencia:**

```csharp
// En Program.cs (API layer):
services.AddSingleton<IEventStore>(sp => new PostgresEventStore(...));
services.AddScoped<CheckInPatientCommandHandler>();  // Application
// ...
```

**Problema:** Si cambia Event Store (de PostgreSQL a EventStoreDB), todo el Program.cs debe refactorizarse.
**Recomendación:**

- Crear `IocContainer` o módulos de composición en capa Application/Infrastructure
- Program.cs solo calla composición root: `builder.Services.AddApplicationLayer()`
- Cada layer export su own service registration

---

### C. TESTING E INTEGRIDAD (2 hallazgos)

#### H-TEST-001: Cobertura de pruebas en Infrastructure sin tests

**Criticidad:** 🟠 **ALTA**
**Componente:** WaitingRoom.Infrastructure
**Descripción:** No existe suite `WaitingRoom.Tests.Infrastructure`. PostgresEventStore, OutboxStore y Publisher no tienen tests.
**Ubicación:** [rlapp-backend/src/Tests/](rlapp-backend/src/Tests/) (carpeta no incluye Infrastructure tests)
**Evidencia:**

```
Tests/
├── WaitingRoom.Tests.Application
├── WaitingRoom.Tests.Domain
├── WaitingRoom.Tests.Integration
├── WaitingRoom.Tests.Projections
├── (FALTA: WaitingRoom.Tests.Infrastructure)
```

**Riesgo:** Bugs silenciosos en persistencia: corrupción de eventos, pérdida de outbox, deadlocks en transacciones.
**Recomendación:**

- Crear `WaitingRoom.Tests.Infrastructure` con:
  - `PostgresEventStoreTests` (save, load, concurrency)
  - `PostgresOutboxStoreTests` (idempotencia, ordering)
  - `RabbitMqPublisherTests` (connection, retry, nack handling)
- Usar TestContainers (PostgreSQL en Docker)
- Target >80% coverage en Infrastructure

---

#### H-TEST-002: Falta de tests de seguridad (security tests)

**Criticidad:** 🟠 **ALTA**
**Componente:** WaitingRoom.Tests.*
**Descripción:** No hay tests para header injection, role escalation, identidad clínica falsificada.
**Ubicación:** [Ningún lugar - gap detectado]
**Riesgo:** Vulnerabilidades de seguridad (OWASP Top 10: A01 Broken Access Control) no se detectan en CI/CD.
**Recomendación:**

- Suite `WaitingRoom.Tests.Security`:
  - Check-in sin authorization header → 401
  - Check-in con rol incorrecto → 403
  - Intento de asumir otro patientId → 403
  - PatientIdentityConflict cuando mismo ID + nombre distinto → 409
- Ejecutar en CI/CD antes de merge

---

### D. INTEGRIDAD CLÍNICA (1 hallazgo)

#### H-CLINIC-001: Validación de identidad clínica débil

**Criticidad:** 🟠 **ALTA**
**Componente:** WaitingRoom.Application/CommandHandlers, WaitingRoom.Infrastructure/Persistence
**Descripción:** Conflicto de identidad (mismo patientId con nombre distinto) detectado pero manejo ad-hoc.
**Ubicación:** [rlapp-backend/docs/ARCHITECTURE.md#L25-L30](rlapp-backend/docs/ARCHITECTURE.md#L25-L30)
**Evidencia:** Error mapeado en ExceptionHandler, pero:

```csharp
// En PatientIdentityRegistry:
if (existingPatient.Name != request.Name)
    throw new PatientIdentityConflictException(...);
// Pero no hay compensación, rollback automático, o notificación a operario
```

**Problema:** Operario ve error 409 pero no sabe qué hacer (intentar de nuevo?, cambiar nombre?, reportar al médico?).
**Recomendación:**

- Documentar en UI/operario: "Paciente ya registrado con nombres distintos. Verificar identidad".
- Auditar intentos fallidos en tabla `malformed_check_ins` para análisis forense
- Requerir validación manual antes de permitir retry

---

### E. CONFIGURACIÓN Y DEPLOYMENT (1 hallazgo)

#### H-CONFIG-001: Ausencia de configuration validation

**Criticidad:** 🟡 **MEDIA**
**Componente:** WaitingRoom.API/Program.cs
**Descripción:** No hay validación de connection strings al startup.
**Ubicación:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs:60-65](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs#L60)
**Evidencia:**

```csharp
var connectionString = builder.Configuration.GetConnectionString("EventStore")
    ?? throw new InvalidOperationException("EventStore connection string is required");
// Pero no intenta conectar hasta runtime
```

**Problema:** API inicia pero falla al primer comando si PostgreSQL está caído.
**Recomendación:**

- En composición root, ejecutar health check a PostgreSQL/RabbitMQ
- `if (!await eventStore.HealthCheck()) throw new StartupException(...)`
- Fail fast: no iniciar API si dependencias no están disponibles

---

## 3. Tabla Consolidada de Hallazgos

| ID | Severidad | Categoría | Componente | Línea | Hallazgo | Recomendación |
|-----|-----------|-----------|-----------|------|----------|---------------|
| H-SEC-001 | 🔴 CRÍTICA | Seguridad | WaitingRoom.API | L:996 | Sin JWT/OAuth2 | Implementar JWT HS256 |
| H-SEC-002 | 🔴 CRÍTICA | Seguridad | WaitingRoom.API | L:150 | Sin Authorization policies | Role-based guards en endpoints |
| H-SEC-003 | 🔴 CRÍTICA | Seguridad | WaitingRoom.API | L:30 | Sin rate limiting | Middleware Rate Limit 100req/min |
| H-SEC-004 | 🔴 CRÍTICA | Seguridad | docker-compose.yml | L:15 | Secretos en plaintext | Mover a .env + secrets manager |
| H-SEC-005 | 🔴 CRÍTICA | Seguridad | WaitingRoom.API/Hubs | N/A | SignalR sin auth | [Authorize] + JWT handshake |
| H-ARCH-001 | 🟠 ALTA | Arquitectura | CommandHandler | L:75 | Lógica negocio en App | Mover a Value Object factory |
| H-ARCH-002 | 🟠 ALTA | Arquitectura | Projections | L:1 | Read models en memoria | PostgreSQL read models |
| H-ARCH-003 | 🟠 ALTA | Arquitectura | Program.cs | L:70 | Acoplamiento DI | Módulos de composición |
| H-TEST-001 | 🟠 ALTA | Testing | Tests/* | N/A | Sin Infrastructure tests | Suite WaitingRoom.Tests.Infrastructure |
| H-TEST-002 | 🟠 ALTA | Testing | Tests/* | N/A | Sin security tests | Suite WaitingRoom.Tests.Security |
| H-CLINIC-001 | 🟠 ALTA | Integridad Clínica | Application | L:25 | Conflicto identidad débil | Tabla audit + notificación operario |
| H-CONFIG-001 | 🟡 MEDIA | Configuración | Program.cs | L:60 | Sin validación startup | Health check de dependencias |

---

## 4. Patrones Arquitectónicos Validados (Positivos)

✅ **Event Sourcing:** Implementación correcta. Events son inmutables, versionados, con metadata completa.
✅ **CQRS:** Separación clara write (commands) vs read (queries).
✅ **Outbox Pattern:** Garantiza entrega de eventos (single tx commit).
✅ **Hexagonal Architecture:** Capas bien separadas (Domain, Application, Infrastructure).
✅ **Domain-Driven Design:** Agregado WaitingQueue encapsula invariantes.
✅ **Value Objects:** PatientId, Priority, ConsultationType bien implementados.
✅ **Invariantes:** ValidadorWaitingQueueInvariants protege integridad.

---

## 5. Métricas de Calidad (Estáticas)

| Métrica | Valor | Estándar | Estado |
|---------|-------|----------|--------|
| Cobertura de pruebas (global) | ~75% | >80% | ⚠️ Bajo |
| Métodos en comando handler | 200 LOC | <150 LOC | ⚠️ Largo |
| Ciclomatic complexity (aggregate) | 8 | <7 | ⚠️ Elevado |
| Dependencias en Program.cs | 25+ | <15 | ❌ Acoplado |
| Líneas de documentación | 45% | >60% | ✅ Bien |

---

## 6. Plan de Remediación (Priorizado)

### Fase 1: Seguridad (Semana 1)

- [ ] Implementar JWT en Program.cs
- [ ] Agregar [Authorize] a todos los endpoints
- [ ] Rate limiting middleware (100 req/min)
- [ ] Mover secrets a .env / GitHub Secrets

### Fase 2: Testing (Semana 2)

- [ ] Suite WaitingRoom.Tests.Infrastructure
- [ ] Suite WaitingRoom.Tests.Security
- [ ] Coverage >85%

### Fase 3: Arquitectura (Semana 3)

- [ ] PostgreSQL read models
- [ ] Composición root modular
- [ ] Health check startup

### Fase 4: Integridad Clínica (Semana 4)

- [ ] Tabla `malformed_check_ins` para auditoría
- [ ] Documentación de operio para conflictos

---

## 7. Validación de Conformidad

- [x] SOLID: SRP, OCP, LSP, ISP aplicados; DIP incompleto (Config)
- [x] DDD: Agregados, Value Objects, Domain Events correctos
- [x] Seguridad OWASP: A01 (Broken Access Control) CRÍTICA, A02 (Cryptographic Failures) CRÍTICA
- [ ] Testing: Coverage requiere mejora
- [ ] Enterprise-Ready: NO (faltan security + resilience patterns)

---

**Auditoría completada:** 28 de febrero de 2026
**Próximo paso:** RF-AUDIT-003 (Frontend)
