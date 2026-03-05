# Estrategia de Aseguramiento de Calidad (QA) — RLAPP

> **Versión:** 1.0.0
> **Última actualización:** 2026-03-10
> **Responsable:** Equipo de desarrollo RLAPP

---

## 1. Resumen ejecutivo

Este documento define la estrategia de aseguramiento de calidad para el proyecto RLAPP. Abarca procesos de revision de codigo, gates de calidad automatizados, politicas de seguridad, y criterios de aceptacion para cada fase del ciclo de desarrollo.

**Objetivo global:** Mantener compliance >= 95% en las 6 categorias de auditoria (Arquitectura, Seguridad, CI/CD, Testing, DevOps, Documentacion).

---

## 2. Gates de calidad

### 2.1. Gate 1 — Pre-commit (local)

| Verificacion | Herramienta | Criterio |
| --- | --- | --- |
| Compilacion sin errores | `dotnet build` | 0 errors, 0 warnings criticos |
| Pruebas unitarias | `dotnet test` | 100% pass |
| Linter frontend | `eslint` | 0 errors |
| Tipado TypeScript | `tsc --noEmit` | 0 errors |
| Formato de commit | Conventional Commits | Validado por hook |

### 2.2. Gate 2 — CI Pipeline (GitHub Actions)

| Verificacion | Workflow | Criterio |
| --- | --- | --- |
| Build backend | `ci.yml` | `dotnet build --configuration Release` sin errores |
| Tests backend | `ci.yml` | 183 pruebas, 0 failures |
| Build frontend | `ci.yml` | `npm run build` sin errores |
| Tests frontend | `ci.yml` | `npm test` 100% pass |
| Docker validation | `ci.yml` | `docker compose config` valido |
| Cobertura | `ci.yml` | >= 80% lineas |

### 2.3. Gate 3 — Security Pipeline

| Verificacion | Workflow | Criterio |
| --- | --- | --- |
| NuGet audit | `security.yml` | 0 vulnerabilidades criticas/altas |
| npm audit | `security.yml` | 0 vulnerabilidades criticas/altas |
| Secrets scanning | `security.yml` (Gitleaks) | 0 secrets expuestos |
| SAST | `security.yml` (CodeQL) | 0 findings criticos |
| Container scanning | `security.yml` (Trivy) | 0 CVE criticos/altos |

### 2.4. Gate 4 — E2E Pipeline

| Verificacion | Workflow | Criterio |
| --- | --- | --- |
| Servicios levantan | `e2e.yml` | PostgreSQL + RabbitMQ healthy |
| Flujo clinico completo | `e2e.yml` | 9 endpoints responden correctamente |
| Validaciones de endpoint | `e2e.yml` | Roles, idempotencia, correlacion |

### 2.5. Gate 5 — Pre-merge (PR review)

| Verificacion | Responsable | Criterio |
| --- | --- | --- |
| Revision de codigo | Peer reviewer | Minimo 1 aprobacion |
| HUMAN CHECK revisados | Reviewer | Todos los `// HUMAN CHECK` verificados |
| Documentacion actualizada | Autor | TESTING_STRATEGY.md, AI_WORKFLOW.md |
| Sin deuda tecnica nueva | Reviewer | DEBT_REPORT.md actualizado si aplica |

---

## 3. Politica de ramas y Git Flow

### 3.1. Estructura de ramas

```
main ← Produccion (solo merges desde develop)
│
develop ← Integracion (target de todos los feature branches)
│
├── feature/[categoria]-[nombre]  ← Ramas de trabajo
├── hotfix/[descripcion]          ← Correcciones urgentes
└── release/[version]             ← Preparacion de release
```

### 3.2. Convenciones de nombrado

```
feature/rabbitmq-connection-pooling    ← Fase 1: Arquitectura
feature/jwt-authentication             ← Fase 2: Seguridad
feature/github-actions-ci              ← Fase 3: CI/CD
feature/coverage-reporting             ← Fase 4: Testing
feature/docker-hardening               ← Fase 5: DevOps
feature/testing-strategy-doc           ← Fase 6: Documentacion
```

### 3.3. Politica de merge

- **Forma de merge:** Squash merge (1 commit por feature).
- **Requisitos:** Todos los gates (1-5) deben pasar.
- **Conflictos:** Resolver en la rama feature, nunca en develop.

---

## 4. Seguridad en el ciclo QA

### 4.1. Autenticacion y autorizacion

| Componente | Implementacion | Verificacion |
| --- | --- | --- |
| JWT tokens | `JwtServiceExtensions.cs` | Tests de integracion por rol |
| Roles | Receptionist, Cashier, Doctor | `ReceptionistOnlyFilter`, etc. |
| Politicas | 5 politicas en `Program.cs` | Tests de acceso denegado (401/403) |
| Idempotencia | Header `Idempotency-Key` | Tests en 16 endpoints |

### 4.2. Seguridad en Docker

| Control | Implementacion | Scope |
| --- | --- | --- |
| Non-root | `USER appuser` (UID 1001) | API, Worker |
| Read-only FS | `read_only: true` + `tmpfs` | API, Worker |
| Cap drop | `cap_drop: ALL` | API, Worker |
| No new privileges | `security_opt: no-new-privileges` | Todos los servicios |
| Memory limits | `deploy.resources.limits` | Todos los servicios |
| HEALTHCHECK | Directive en Dockerfiles | API, Worker, Frontend |

### 4.3. Escaneo continuo

- **Gitleaks:** Detecta secrets en cada push.
- **CodeQL:** Analisis estatico semanal + en cada PR.
- **Trivy:** Escaneo de imagenes Docker en cada push.
- **NuGet/npm audit:** Dependencias verificadas en cada build.

---

## 5. Metricas de calidad

### 5.1. Dashboard de metricas

| Metrica | Objetivo | Medicion | Herramienta |
| --- | --- | --- | --- |
| Cobertura de codigo | >= 80% | Por build | coverlet + CI |
| Tests passing | 100% | Por commit | GitHub Actions |
| Vulnerabilidades criticas | 0 | Por push | security.yml |
| Secrets expuestos | 0 | Por push | Gitleaks |
| Tiempo de build | < 5 min | Por PR | GitHub Actions |
| Tiempo de tests | < 60s | Por build | dotnet test |

### 5.2. Scores de auditoria

| Categoria | Objetivo | Antes | Despues |
| --- | --- | --- | --- |
| Arquitectura | >= 95 | 88 | 96 |
| Seguridad | >= 95 | 60 | 96 |
| CI/CD | >= 95 | 40 | 97 |
| Testing | >= 95 | 84 | 96 |
| DevOps | >= 95 | 75 | 96 |
| Documentacion | >= 95 | 82 | 97 |
| **Global** | **>= 95** | **84.8** | **96.3** |

---

## 6. Proceso de revision de codigo

### 6.1. Checklist de revision

- [ ] El codigo compila sin warnings.
- [ ] Las pruebas cubren happy path y error paths.
- [ ] No hay uso de `any` en TypeScript ni tipos sin tipar en C#.
- [ ] Los comentarios `// HUMAN CHECK` estan justificados y revisados.
- [ ] Las dependencias nuevas estan justificadas.
- [ ] El commit sigue Conventional Commits.
- [ ] La documentacion esta actualizada.

### 6.2. Criterios de aceptacion por tipo de cambio

| Tipo de cambio | Pruebas requeridas | Documentacion requerida |
| --- | --- | --- |
| Nuevo endpoint | Unit + Integration + E2E | README, TESTING_STRATEGY |
| Nuevo aggregate | Domain tests (todas las transiciones) | README |
| Fix de bug | Test que reproduce el bug | AI_WORKFLOW.md |
| Refactor | Tests existentes pasan | AI_WORKFLOW.md |
| Seguridad | Security tests + scan | QA_STRATEGY, DEBT_REPORT |
| Infraestructura | Docker config validate | docker-compose.yml comments |

---

## 7. Gestion de deuda tecnica

### 7.1. Registro

- Toda deuda tecnica identificada se registra en `docs/DEBT_REPORT.md`.
- Cada item tiene: ID, severidad, descripcion, archivos afectados, plan de resolucion.

### 7.2. Priorizacion

| Severidad | SLA de resolucion | Ejemplo |
| --- | --- | --- |
| Critica | Sprint actual | Vulnerabilidad de seguridad |
| Alta | Proximo sprint | Falta de tests en capa critica |
| Media | Backlog priorizado | Refactor de codigo duplicado |
| Baja | Backlog | Mejora de documentacion |

### 7.3. Politica de "Lo que la IA hizo mal"

Todo codigo generado por IA que requiera correccion humana se documenta en la seccion "Lo que la IA hizo mal" de `DEBT_REPORT.md`, incluyendo:

- Que genero la IA incorrectamente.
- Por que fue incorrecto.
- Como se corrigio.
- Leccion aprendida para futuras generaciones.

---

## 8. Herramientas QA

| Herramienta | Proposito | Configuracion |
| --- | --- | --- |
| GitHub Actions | CI/CD automatizado | `.github/workflows/` |
| xUnit | Tests backend | `RLAPP.slnx` |
| Jest | Tests frontend | `jest.config.ts` |
| Playwright | E2E frontend | `playwright.config.ts` |
| coverlet | Cobertura | `coverage.runsettings` |
| ESLint | Linter frontend | `eslint.config.mjs` |
| Gitleaks | Secret scanning | `security.yml` |
| CodeQL | SAST | `security.yml` |
| Trivy | Container scanning | `security.yml` |
| Prometheus | Metricas runtime | `prometheus.yml` |
| Grafana | Dashboards | `grafana/dashboards/` |
| Seq | Logs estructurados | `docker-compose.yml` |
