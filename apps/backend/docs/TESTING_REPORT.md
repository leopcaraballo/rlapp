# Reporte de pruebas — QA Ecosystem v2.0

> **Fecha:** 2026-03-15
> **Autor:** QA Engineering (asistido por IA)
> **Modelo SA:** Claude Opus 4.6 (Tier 1)
> **Version:** 2.0.0
> **Estado:** Todas las pruebas pasando (489/489)

---

## 1. Resumen ejecutivo

Se implemento un ecosistema completo de pruebas de calidad (QA Ecosystem) para el backend de RLAPP, abarcando 8 nuevas categorias de prueba que complementan las pruebas unitarias y de integracion existentes. El resultado es un incremento de **131 pruebas existentes a 277 pruebas** en el proyecto de integracion, y un total de **489 pruebas en el backend completo**.

### 1.1 Metricas clave

| Metrica | Antes | Despues | Delta |
| --- | --- | --- | --- |
| Total pruebas backend | 323 | 489 | +166 (+51%) |
| Pruebas de integracion | 131 | 277 | +146 (+111%) |
| Categorias de prueba | 2 (Unit, Integration) | 9 (+Smoke, Sanity, Regression, Security, Performance, Contract, Validation) | +7 |
| Pruebas de seguridad | 0 | 81+ | +81 |
| Pruebas de rendimiento | 0 | 6 | +6 |
| Pruebas de contrato API | 0 | 7 | +7 |
| Pruebas de validacion | 0 | 46 | +46 |
| Tasa de aprobacion | 100% | 100% | = |
| Jobs en CI/CD pipeline | 6 | 8 | +2 |

### 1.2 Distribucion por proyecto de test

| Proyecto | Pruebas | Framework | Estado |
| --- | --- | --- | --- |
| WaitingRoom.Tests.Domain | 189 | xUnit 2.9.3 + FluentAssertions 8.8.0 | 189/189 pasando |
| WaitingRoom.Tests.Application | 12 | xUnit 2.9.3 + FluentAssertions 8.8.0 | 12/12 pasando |
| WaitingRoom.Tests.Projections | 11 | xUnit 2.6.2 + FluentAssertions 6.12.0 | 11/11 pasando |
| WaitingRoom.Tests.Integration | 277 | xUnit 2.9.0 + FluentAssertions 6.12.0 | 277/277 pasando |

---

## 2. Inventario de pruebas nuevas

### 2.1 Smoke Tests — `Functional/SmokeTests.cs`

**Objetivo:** Verificacion rapida de que el sistema esta operativo y los endpoints basicos responden.

| ID | Test | Tipo | Nivel | Conocimiento | Resultado |
| --- | --- | --- | --- | --- | --- |
| SMK-001 | Health liveness responde 200 | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-002 | Health readiness responde 200 | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-003 | Check-in endpoint registrado | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-004 | Cashier endpoint registrado | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-005 | Medical endpoint registrado | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-006 | OpenAPI schema disponible | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-007 | Headers de seguridad presentes | Funcional | Sistema | Caja Negra | Aprobado |
| SMK-008 | Endpoint inexistente retorna 404 | Funcional | Sistema | Caja Negra | Aprobado |

### 2.2 Sanity Tests — `Functional/SanityTests.cs`

**Objetivo:** Verificacion de que las funcionalidades criticas del negocio operan correctamente.

| ID | Test | Tipo | Nivel | Conocimiento | Resultado |
| --- | --- | --- | --- | --- | --- |
| SAN-001 | Check-in basico exitoso | Funcional | Sistema | Caja Negra | Aprobado |
| SAN-002 | Llamada a caja exitosa | Funcional | Sistema | Caja Negra | Aprobado |
| SAN-003 | Validacion de pago rechaza datos incompletos | Funcional | Sistema | Caja Negra | Aprobado |
| SAN-004 | Check-in idempotente retorna respuesta cacheada | Funcional | Sistema | Caja Negra | Aprobado |
| SAN-005 | Request sin autenticacion retorna 401 | Funcional | Sistema | Caja Negra | Aprobado |
| SAN-006 | Correlation-Id presente en respuestas | Funcional | Sistema | Caja Negra | Aprobado |

### 2.3 Regression Tests — `Functional/RegressionTests.cs`

**Objetivo:** Prevenir la reintroduccion de defectos previamente corregidos.

| ID | Test | Defecto original | Resultado |
| --- | --- | --- | --- |
| REG-001 | Auth regression S-05: rol Receptionist accede a check-in | S-05: roles no validados | Aprobado |
| REG-002 | Auth regression S-06: rol Cashier accede a cashier | S-06: roles no validados | Aprobado |
| REG-003 | Idempotency-Key obligatorio en comandos | Faltaba validacion de header | Aprobado |
| REG-004 | PatientId case-insensitive | "PAT-001" y "pat-001" misma identidad | Aprobado |
| REG-005 | Capacidad de cola se respeta | Check-in en cola llena rechazado | Aprobado |
| REG-006 | Alias reception funciona como Receptionist | Alias de rol no reconocido | Aprobado |

### 2.4 Security Tests — Authentication Bypass

**Archivo:** `NonFunctional/Security/AuthenticationBypassTests.cs`

| ID | Test | Tecnica OWASP | Resultado |
| --- | --- | --- | --- |
| SEC-AUTH-001 | 16 endpoints sin autenticacion retornan 401 | A01:2021 Broken Access Control | Aprobado |
| SEC-AUTH-002 | Header X-User-Role vacio retorna 401 | A07:2021 Auth Failures | Aprobado |
| SEC-AUTH-003 | Roles inventados (SuperAdmin, Root, System, etc.) rechazados | A01:2021 | Aprobado |
| SEC-AUTH-004 | Multiples headers X-User-Role no conceden acceso | A01:2021 | Aprobado |
| SEC-AUTH-005 | Respuesta 401 no revela informacion interna | A04:2021 Insecure Design | Aprobado |
| SEC-AUTH-006 | Health endpoints publicos (sin auth) | Diseno intencional | Aprobado |

### 2.5 Security Tests — Input Injection

**Archivo:** `NonFunctional/Security/InputInjectionTests.cs`

| ID | Test | Vector de ataque | Resultado |
| --- | --- | --- | --- |
| SEC-INJ-001 | SQL injection en PatientId y PatientName | `'; DROP TABLE--`, UNION SELECT | Aprobado (no 500) |
| SEC-INJ-002 | XSS payloads en campos de texto | `<script>alert(1)</script>`, `<img onerror>` | Aprobado (no 500) |
| SEC-INJ-003 | Command injection en QueueId | `; rm -rf /`, backtick commands | Aprobado (no 500) |
| SEC-INJ-004 | Path traversal en IDs | `../../etc/passwd`, `..\\windows` | Aprobado (no 500) |
| SEC-INJ-005 | JSON malformado | `{invalid`, sin cierre | Aprobado (no 500) |
| SEC-INJ-006 | Payload excesivo (100KB) | Body de 100,000+ caracteres | Aprobado (no 500) |
| SEC-INJ-007 | Content-Type incorrecto | `text/plain`, `application/xml` | Aprobado (415 o 400) |
| SEC-INJ-008 | Body vacio en POST | Sin contenido | Aprobado (no 500) |

### 2.6 Security Tests — Privilege Escalation

**Archivo:** `NonFunctional/Security/PrivilegeEscalationTests.cs`

| ID | Test | Escenario RBAC | Resultado |
| --- | --- | --- | --- |
| SEC-PRIV-001 | Receptionist no accede a endpoints de Cashier | Cross-role horizontal | Aprobado (403/401) |
| SEC-PRIV-002 | Receptionist no accede a endpoints de Doctor | Cross-role vertical | Aprobado (403/401) |
| SEC-PRIV-003 | Cashier no accede a endpoints de Doctor | Cross-role vertical | Aprobado (403/401) |
| SEC-PRIV-004 | Doctor no accede a endpoints de Receptionist | Cross-role reverso | Aprobado (403/401) |
| SEC-PRIV-005 | Doctor no accede a endpoints de Cashier | Cross-role reverso | Aprobado (403/401) |
| SEC-PRIV-006 | Admin accede a todos los endpoints | Rol universal | Aprobado (200/400) |
| SEC-PRIV-007 | Bypass por case sensitivity (RECEPTIONIST, rEcEpTiOnIsT) | Case manipulation | Aprobado |

### 2.7 Performance Tests — `NonFunctional/Performance/ApiResponseTimeTests.cs`

| ID | Test | Umbral | Resultado |
| --- | --- | --- | --- |
| PERF-001 | Check-in individual < 1000ms | 1000ms | Aprobado |
| PERF-002 | Health endpoint < 500ms | 500ms | Aprobado |
| PERF-003 | 10 requests concurrentes p95 < 2000ms | 2000ms | Aprobado |
| PERF-004 | 50 requests concurrentes p95 < 5000ms | 5000ms | Aprobado |
| PERF-005 | Flujo clinico completo (7 pasos) < 5000ms | 5000ms | Aprobado |
| PERF-006 | Throughput > 5 req/s | 5 req/s | Aprobado |

### 2.8 Contract Tests — `Contract/ApiContractTests.cs`

| ID | Test | Contrato verificado | Resultado |
| --- | --- | --- | --- |
| CTR-001 | Check-in exitoso contiene success, queueId, eventCount | Estructura 200 | Aprobado |
| CTR-002 | Cashier response contiene patientId | Estructura 200 (cashier) | Aprobado |
| CTR-003 | Error 400 es JSON parseable | Estructura error | Aprobado |
| CTR-004 | 401 no revela datos sensibles (passwords, secrets, JWT reales) | Seguridad | Aprobado |
| CTR-005 | Correlation-Id enviado se refleja en respuesta | Header contract | Aprobado |
| CTR-006 | Idempotency-Replayed header presente en replay | Idempotencia contract | Aprobado |
| CTR-007 | Content-Type es application/json | Media type contract | Aprobado |

### 2.9 Validation Tests — `Validation/DataValidationTests.cs`

| ID | Test | Tecnica | Casos | Resultado |
| --- | --- | --- | --- | --- |
| VAL-001 | PatientId vacio rechazado | Particion equivalencia | 3 variantes ("", " ", "   ") | Aprobado |
| VAL-002 | PatientName vacio rechazado | Particion equivalencia | 3 variantes | Aprobado |
| VAL-003 | Priority invalida rechazada | Particion equivalencia | 3 variantes (SuperUrgent, Critical, 999) | Aprobado |
| VAL-004 | Priority valida aceptada | Particion equivalencia | 4 valores (Low, Medium, High, Urgent) | Aprobado |
| VAL-005 | ConsultationType BVA | Valores limite | 4 fronteras (1 char, 2 chars, 100 chars, 101 chars) | Aprobado |
| VAL-006 | QueueId formato invalido | Particion equivalencia | 3 valores (no-es-guid, 123, "") | Aprobado |
| VAL-007 | Actor campo vacio rechazado | Particion equivalencia | 3 variantes | Aprobado |
| VAL-008 | PatientId excede longitud maxima (21 chars) | Valores limite | 1 caso | Aprobado |
| VAL-009 | PatientId longitud minima (1 char) aceptado | Valores limite | 1 caso | Aprobado |
| VAL-010 | Operacion en cola inexistente | Particion equivalencia | 1 caso | Aprobado |
| VAL-011 | Unicode en nombres de paciente | Robustez | 4 variantes (Jose, David chino, Francois, Natalya) | Aprobado |
| VAL-012 | Paciente duplicado manejado | Regla de dominio | 1 caso | Aprobado |

---

## 3. Clasificacion Caja Blanca vs Caja Negra

### 3.1 Pruebas de Caja Blanca (estructura interna conocida)

Se aplican en niveles 1 y 2, donde el equipo conoce la implementacion interna del codigo.

| Proyecto | Tipo | Tecnica | Pruebas |
| --- | --- | --- | --- |
| WaitingRoom.Tests.Domain | Unitaria | Cobertura de sentencias, ramas, condiciones | 189 |
| WaitingRoom.Tests.Application | Unitaria | Cobertura de ramas (handlers con fakes) | 12 |
| WaitingRoom.Tests.Projections | Componente | Cobertura de sentencias (replay + idempotencia) | 11 |
| Tests.Integration/Infrastructure | Integracion | Verificacion de contratos internos con infra real | ~20 |
| Tests.Integration/Worker | Integracion | Verificacion de outbox dispatch con infra real | ~5 |

**Total Caja Blanca:** ~237 pruebas

### 3.2 Pruebas de Caja Negra (estructura interna desconocida)

Se aplican en nivel 3, donde el tester interactua solo con la interfaz HTTP publica sin conocimiento de la implementacion.

| Categoria | Archivo(s) | Tecnica | Pruebas |
| --- | --- | --- | --- |
| Smoke | `Functional/SmokeTests.cs` | Verificacion de disponibilidad | 8 |
| Sanity | `Functional/SanityTests.cs` | Verificacion funcional basica | 6 |
| Regression | `Functional/RegressionTests.cs` | Prevencion de regresiones | 6 |
| Security: Auth Bypass | `NonFunctional/Security/AuthenticationBypassTests.cs` | OWASP A01, A07 | ~30 |
| Security: Injection | `NonFunctional/Security/InputInjectionTests.cs` | OWASP A03 | ~25 |
| Security: Privilege | `NonFunctional/Security/PrivilegeEscalationTests.cs` | OWASP A01 | ~26 |
| Performance | `NonFunctional/Performance/ApiResponseTimeTests.cs` | Tiempos de respuesta, concurrencia | 6 |
| Contract | `Contract/ApiContractTests.cs` | Verificacion de estructura de respuestas | 7 |
| Validation | `Validation/DataValidationTests.cs` | Particion de equivalencia, BVA | 46 |
| E2E existentes | `EndToEnd/*.cs`, `API/*.cs` | Flujos clinicos completos | ~70 |

**Total Caja Negra:** ~230 pruebas

### 3.3 Pruebas mixtas (Caja Blanca + Caja Negra)

| Categoria | Descripcion | Pruebas |
| --- | --- | --- |
| Integration con fakes | Usa WaitingRoomApiFactory (conoce internals) pero verifica via HTTP (black-box) | ~22 |

---

## 4. Los siete principios del testing aplicados

### P1: Las pruebas muestran la presencia de defectos, no su ausencia

Las 489 pruebas reducen el riesgo pero no garantizan ausencia total de fallos. Por ello se implementan multiples niveles: un defecto que escape del nivel unitario puede detectarse en integracion, seguridad o validacion.

**Evidencia:** CTR-004 revelo que la respuesta 401 contenia la palabra "token" en el mensaje de error. Se corrigio la asercion para distinguir entre mensajes informativos y fugas reales de credenciales (patron JWT `eyJ...`).

### P2: Las pruebas exhaustivas son imposibles

El espacio de entrada es combinatorio: 4 prioridades x longitudes de PatientId (1-20) x ConsultationType (2-100) x roles (4+) = millones de combinaciones. Se aplica particion de equivalencia (VAL-001 a VAL-012) y valores limite (VAL-005, VAL-008, VAL-009) para seleccionar representantes eficientes.

### P3: Testing temprano (shift-left)

El pipeline CI/CD ejecuta `smoke-sanity-tests` como puerta rapida (<5s) antes de los tests de integracion y QA extendida. Si falla un smoke test, no se gastan recursos en tests mas pesados.

### P4: Agrupacion de defectos

La mayor concentracion de defectos se encuentra en:

- **Seguridad (81+ tests):** Validacion de autenticacion y autorizacion en todos los endpoints.
- **Validacion de entrada (46 tests):** Campos vacios, longitudes invalidas, formatos incorrectos.
- **Dominio (189 tests):** Transiciones de estado del agregado `WaitingQueue`.

### P5: Paradoja del pesticida

Los tests iniciales del check-in validaban solo el caso exitoso. Se agregaron progresivamente:

- Tests de inyeccion SQL/XSS/CommandInjection (SEC-INJ-001 a 008).
- Tests de escalacion de privilegios con matriz RBAC completa (SEC-PRIV-001 a 007).
- Tests de valores limite con Unicode (VAL-011: Jose, David chino, Francois, Natalya rusa).
- Tests de rendimiento bajo concurrencia (PERF-003, PERF-004).

### P6: Las pruebas dependen del contexto

RLAPP es un sistema clinico con Event Sourcing, lo cual implica:

1. Los tests de seguridad son criticos (datos de pacientes).
2. La idempotencia es vital (mensajes asincronos pueden reenviarse).
3. Los tests de rendimiento aseguran tiempos de respuesta clinicamente aceptables.
4. Los tests de contrato previenen roturas en integraciones con el frontend.

### P7: La ausencia de errores es una falacia

Un sistema que aprueba 489 tests pero no cumple las necesidades del usuario clinico no tiene valor. Los tests de Sanity verifican los flujos de negocio criticos (check-in, caja, consulta) y los tests de regresion previenen la reintroduccion de defectos ya corregidos.

---

## 5. Integracion CI/CD

### 5.1 Estructura del pipeline actualizado

```
lint-and-build
  |
  +---> component-tests (Unit: Domain + Application + Projections)
  |
  +---> smoke-sanity-tests (Puerta rapida: 14 tests, <5s)
  |       |
  |       +---> integration-tests (Infra real: PostgreSQL + RabbitMQ)
  |       |
  |       +---> qa-extended-tests (Security, Contract, Validation, Performance, Regression)
  |               |
  +---------------+---> black-box-tests (Docker Compose stack completo)
  |
  +---> image-scan (Trivy)
  |
  +---> release (solo main, depende de todos)
```

### 5.2 Filtros de categoria por job

| Job CI/CD | Filtro `dotnet test --filter` | Tests esperados |
| --- | --- | --- |
| `component-tests` | `Category!=Integration&FullyQualifiedName!~Tests.Integration` | 212 |
| `smoke-sanity-tests` | `Category=Smoke` / `Category=Sanity` | 14 |
| `integration-tests` | `Category=Integration\|FullyQualifiedName~Tests.Integration` | 277 |
| `qa-extended-tests` (Security) | `Category=Security` | 81+ |
| `qa-extended-tests` (Contract) | `Category=Contract` | 7 |
| `qa-extended-tests` (Validation) | `Category=Validation` | 46+ |
| `qa-extended-tests` (Performance) | `Category=Performance` | 6 |
| `qa-extended-tests` (Regression) | `Category=Regression` | 6 |

### 5.3 Ejecucion local

```bash
# Todas las pruebas del backend
cd apps/backend && dotnet test RLAPP.slnx --configuration Release

# Solo Smoke + Sanity (puerta rapida)
dotnet test src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj \
  --configuration Release --filter "Category=Smoke|Category=Sanity"

# Solo Security
dotnet test src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj \
  --configuration Release --filter "Category=Security"

# Solo Performance
dotnet test src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj \
  --configuration Release --filter "Category=Performance"

# Solo Contract + Validation
dotnet test src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj \
  --configuration Release --filter "Category=Contract|Category=Validation"

# Solo Regression
dotnet test src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj \
  --configuration Release --filter "Category=Regression"

# Script detallado existente
./run-tests-detail.sh --integration
```

---

## 6. Hallazgos y correcciones durante la implementacion

### 6.1 CTR-004: Falso positivo en validacion de fuga de informacion

- **Problema:** La asercion `body.Should().NotContain("token")` fallaba porque la respuesta 401 contenia `"Proporcione un token JWT valido"` — un mensaje informativo para el usuario, no una fuga de credenciales.
- **Correccion:** Se reemplazo la asercion generica por verificaciones especificas: no contener `password`, `secret`, `connectionstring`, `Exception`, `stack trace`, y no contener patrones de tokens JWT reales (`eyJ...`).
- **Leccion:** Las aserciones de seguridad deben distinguir entre terminologia informativa y datos sensibles reales.

### 6.2 FluentAssertions 6.x vs 8.x: Incompatibilidad de API `BeOneOf`

- **Problema:** En FluentAssertions 6.12.0, `BeOneOf(valor1, valor2, "porque...")` interpreta el string `"porque..."` como otro valor a comparar (overload `params`).
- **Correccion:** Se uso la sintaxis de array explicito: `BeOneOf(new[] { valor1, valor2 }, "porque...")`.
- **Impacto:** 3 archivos corregidos (`RegressionTests.cs`, `PrivilegeEscalationTests.cs`, `AuthenticationBypassTests.cs`).

### 6.3 Desalineacion de versiones de dependencias

| Dependencia | Domain/Application | Integration/Projections | Riesgo |
| --- | --- | --- | --- |
| xUnit | 2.9.3 | 2.9.0 / 2.6.2 | Bajo (API compatible) |
| FluentAssertions | 8.8.0 | 6.12.0 | **Alto** (API incompatible) |
| Moq | 4.20.70 | 4.20.70 | Ninguno |

**Recomendacion:** Crear `Directory.Build.props` para centralizar versiones de paquetes NuGet.

---

## 7. Brechas identificadas y recomendaciones

### 7.1 Brechas actuales

| Brecha | Severidad | Recomendacion |
| --- | --- | --- |
| Sin `Directory.Build.props` | Media | Centralizar versiones de NuGet para evitar desalineaciones |
| FluentAssertions 6.12.0 en Integration | Media | Actualizar a 8.x para unificar API |
| Sin cobertura de lineas formal | Media | Configurar `coverlet` con umbral minimo de 80% |
| Tests de Performance en in-memory (no infra real) | Baja | Agregar tests de rendimiento con Docker Compose para mediciones realistas |
| Sin tests de carga sostenida | Baja | Implementar tests con k6/Locust para validar escalabilidad |
| NSubstitute 4.4.0 en Projections sin uso | Baja | Eliminar dependencia no utilizada |

### 7.2 Trabajo futuro

1. **Cobertura formal:** Integrar `dotnet-coverage` con reporte Cobertura en CI/CD.
2. **Mutation testing:** Implementar Stryker.NET para validar la calidad de las aserciones.
3. **Load testing:** Agregar tests con k6 contra Docker Compose stack.
4. **Contract testing con Pact:** Verificar contratos frontend-backend automaticamente.
5. **Chaos engineering:** Tests de resiliencia (fallo de PostgreSQL, timeout de RabbitMQ).

---

## 8. Archivos creados/modificados

### 8.1 Archivos nuevos (8 test files)

| Archivo | Categoria | Tests | Lineas |
| --- | --- | --- | --- |
| `Functional/SmokeTests.cs` | Smoke | 8 | ~180 |
| `Functional/SanityTests.cs` | Sanity | 6 | ~200 |
| `Functional/RegressionTests.cs` | Regression | 6 | ~220 |
| `NonFunctional/Security/AuthenticationBypassTests.cs` | Security | ~30 | ~350 |
| `NonFunctional/Security/InputInjectionTests.cs` | Security | ~25 | ~300 |
| `NonFunctional/Security/PrivilegeEscalationTests.cs` | Security | ~26 | ~280 |
| `NonFunctional/Performance/ApiResponseTimeTests.cs` | Performance | 6 | ~220 |
| `Contract/ApiContractTests.cs` | Contract | 7 | ~310 |
| `Validation/DataValidationTests.cs` | Validation | 46 | ~420 |

### 8.2 Archivos modificados

| Archivo | Cambio | Motivo |
| --- | --- | --- |
| `.github/workflows/ci.yml` | +2 jobs: `smoke-sanity-tests`, `qa-extended-tests` | Integracion CI/CD |
| `docs/testing/TEST_PLAN.md` | Secciones 2, 5, 6, 8, 9, 10 actualizadas | Documentacion actualizada |

### 8.3 Archivos no modificados (scope respetado)

- `/apps/frontend/` — sin cambios (solo lectura)
- Codigo fuente del backend (`src/Services/`) — sin cambios
- Tests existentes — sin modificaciones

---

## 9. Evidencia de ejecucion

```
$ dotnet test RLAPP.slnx --configuration Release --verbosity minimal

Correctas! - Con error: 0, Superado: 189, Total: 189 - WaitingRoom.Tests.Domain.dll
Correctas! - Con error: 0, Superado:  12, Total:  12 - WaitingRoom.Tests.Application.dll
Correctas! - Con error: 0, Superado:  11, Total:  11 - WaitingRoom.Tests.Projections.dll
Correctas! - Con error: 0, Superado: 277, Total: 277 - WaitingRoom.Tests.Integration.dll

Total: 489 pruebas, 0 fallos, 0 omitidas
```
