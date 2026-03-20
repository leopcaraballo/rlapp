# 📚 RLAPP Refactorización - Índice Completo

**Plan de Refactorización Integral: Eliminar Queues, Rediseñar Arquitectura del Sistema de Triage Médico**

---

## 🎯 Punto de Entrada: Por Dónde Empezar

### Si eres **Ejecutivo o PM**
👉 **Lee primero**: [📋 RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)  
- Visión y objetivos
- Timeline y costo
- Riesgos y mitigación
- KPIs de éxito
- Preguntas frecuentes

**Tiempo de lectura**: 15 minutos

---

### Si eres **Arquitecto o Senior Developer**
👉 **Lee primero**: [🏗️ FASE-1-DOMINIO-Y-BD.md](FASE-1-DOMINIO-Y-BD.md)  
- Cambio arquitectónico de alto nivel
- Nuevo modelo de dominio (Patient + ConsultingRoom)
- Eventos de dominio
- Schema SQL refactorizado
- Proyecciones (read models)
- Invariantes de negocio

👉 **Luego**: [💻 FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)  
- CQRS handlers
- API endpoints
- Frontend refactorización
- Testing strategy
- Deployment plan

**Tiempo de lectura**: 60 minutos

---

### Si eres **Backend Developer**
Flujo recomendado:
1. Lee **[RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)** - Contexto global (10 min)
2. Lea **[FASE-1-DOMINIO-Y-BD.md](FASE-1-DOMINIO-Y-BD.md)** - Dominio + Agregados (30 min)
3. Lea **[FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)** - CQRS + API (30 min)
4. Implementa según checklist en cada documento
5. Corre tests y pide code review

**Artifacts a crear:**
- [ ] Patient.cs (Agregado)
- [ ] ConsultingRoom.cs (Agregado)
- [ ] 12+ eventos de dominio
- [ ] 11+ command handlers
- [ ] 4+ query handlers
- [ ] 15+ API endpoints
- [ ] 45+ tests unitarios + integration

---

### Si eres **Frontend Developer**
Flujo recomendado:
1. Lee **[RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)** - Contexto (10 min)
2. Lee sección "Fase 3: Frontend" en **[FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)** (20 min)
3. Implementa hooks refactorizados
4. Adapta componentes existentes (NO crear nuevos)
5. Integra con backend via API client
6. Corre tests y pide code review

**Artifacts a crear:**
- [ ] 5+ custom hooks
- [ ] 6+ componentes adaptados
- [ ] 7+ páginas refactorizadas
- [ ] 25+ tests Jest
- [ ] 8+ tests E2E (Cypress)

---

### Si eres **QA Engineer**
Flujo recomendado:
1. Lee **[RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)** - Objetivos/Riesgos (10 min)
2. Lee sección "Fase 4: Testing" en **[FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)** (20 min)
3. Diseña matrix de test cases (8 flujos críticos)
4. Automatiza E2E tests con Cypress
5. Ejecuta performance testing con k6
6. Valida security checklist

**Artifacts a crear:**
- [ ] 8+ E2E test suites
- [ ] Load test scripts (k6)
- [ ] Security checklist (OWASP)
- [ ] Test report + coverage metrics

---

### Si eres **DevOps/SRE**
Flujo recomendado:
1. Lee **[RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)** - Deploy section (15 min)
2. Lee sección "Fase 5: Deploy" en **[FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)** (25 min)
3. Prepara CI/CD pipeline updates
4. Configura monitoring (Prometheus + Grafana)
5. Crea canary deployment script
6. Documenta runbook

**Artifacts a crear:**
- [ ] Updated CI/CD workflows
- [ ] Database migration scripts
- [ ] Terraform/IaC definitions (si aplica)
- [ ] Monitoring dashboards
- [ ] Canary deployment automation
- [ ] Rollback scripts

---

## 📖 Documentos

### 1. 📋 [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)
**Objetivo**: Visión y guía de implementación a alto nivel

**Secciones:**
- Visión y alcance
- Cambio arquitectónico antes/después
- Timeline y fases (4-5 semanas)
- Matriz de cambios impactados
- Riesgos y mitigación
- Testing strategy pyramid
- Quick start guide
- FAQ

**Audiencia**: Ejecutivos, PMs, Tech Leads, Arquitectos

---

### 2. 🏗️ [FASE-1-DOMINIO-Y-BD.md](FASE-1-DOMINIO-Y-BD.md)
**Objetivo**: Especificación técnica de Dominio y Base de Datos

**Secciones:**
- Visión general del refactoring
- Cambios struct del dominio
  - Patient Aggregate (completo con métodos y event handlers)
  - ConsultingRoom Aggregate
  - Invariants classes
- Value Objects
  - PatientIdentity
  - ConsultingRoomId
  - PaymentAmount
- Schema SQL refactorizado
  - Event Store (con aggregate_type)
  - Outbox Pattern
  - 5 nuevas proyecciones
  - Índices y constraints
- Nuevos eventos de dominio (12+)
  - PatientRegistered, PatientMarkedAsWaiting, etc.
  - ConsultingRoomCreated, ConsultingRoomActivated, etc.
- Proyecciones especializadas
  - PatientStateProjection
  - ConsultingRoomOccupancyProjection
  - WaitingRoomDisplayProjection
  - CashierQueueProjection
  - CompletedPatientsProjection
- Checklist Fase 1 (BD, Dominio, Proyecciones, Testing)

**Audiencia**: Arquitectos, Backend Developers, DBAs

---

### 3. 💻 [FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)
**Objetivo**: Especificación técnica de CQRS, Frontend, Testing y Deploy

**Secciones Fase 2 (Backend CQRS)**
- 11 Command Handlers (Register, Assign, Start, Finish, Cashier, etc.)
- 4 Query Handlers (GetState, GetWaiting, GetOccupancy, GetCashier)
- 15+ API Endpoints refactorizados
- SignalR Hub rediseñado (7 canales temáticos)
- EventPublisher integration

**Secciones Fase 3 (Frontend)**
- Nueva estructura de rutas (sin nuevas pantallas)
- Custom hooks (5+)
  - usePatientState
  - useWaitingPatients
  - useConsultingRoomOccupancy
  - ...
- Componentes UI refactorizados (6+)
  - PatientAssignment
  - CashierQueue
  - ConsultingRoomCard
  - WaitingRoomDisplay
  - ...
- Páginas refactorizadas (7)
  - /registration (público)
  - /reception (asignación)
  - /medical (consulta)
  - /cashier (pago)
  - /display (público)
  - /dashboard (admin)
  - /consulting-rooms (admin)

**Secciones Fase 4 (Testing)**
- Backend Tests (xUnit)
  - Patient Aggregate Tests (state transitions)
  - Command Handler Integration Tests
  - Query Handler Tests
  - Projection Tests
  - API Tests
- Frontend Tests (Jest)
  - Component tests
  - Hook tests
  - Page tests
- E2E Tests (Cypress)
  - Complete patient flow
  - Absence scenarios
  - Payment failures
  - Admin operations

**Secciones Fase 5 (Deploy)**
- ADR (Architecture Decision Records) templates
- Migration Guide (paso a paso)
- Updated README
- Deployment Strategy (canary 15% → 50% → 100%)

**Audiencia**: Backend Developers, Frontend Developers, QA Engineers, DevOps

---

## 🗂️ Estructura de Directorios (en el Repo)

```
docs/refactoring/
├── 📋 RESUMEN-EJECUTIVO.md              ← START HERE
├── 🏗️ FASE-1-DOMINIO-Y-BD.md           ← Technical spec Phase 1
├── 💻 FASE-2-5-BACKEND-FRONTEND-TESTING.md ← Technical spec Phases 2-5
└── 📚 INDICE.md                        ← Este archivo

apps/backend/src/
├── Services/WaitingRoom/
│   ├── WaitingRoom.Domain/
│   │   ├── Aggregates/
│   │   │   ├── Patient.cs              ← NUEVO (ver FASE-1)
│   │   │   └── ConsultingRoom.cs       ← NUEVO
│   │   ├── Events/
│   │   │   ├── PatientRegistered.cs    ← NUEVO
│   │   │   ├── PatientArrivedAtCashier.cs ← NUEVO
│   │   │   └── ...12+ eventos más
│   │   ├── ValueObjects/
│   │   │   ├── PatientIdentity.cs      ← NUEVO
│   │   │   ├── ConsultingRoomId.cs     ← NUEVO
│   │   │   └── PaymentAmount.cs        ← NUEVO
│   │   └── Invariants/
│   │       ├── PatientInvariants.cs    ← NUEVO
│   │       └── ConsultingRoomInvariants.cs ← NUEVO
│   ├── WaitingRoom.Application/
│   │   ├── CommandHandlers/
│   │   │   ├── RegisterPatientCommandHandler.cs ← NUEVO
│   │   │   ├── MarkPatientAsWaitingCommandHandler.cs ← NUEVO
│   │   │   └── ...11 handlers (ver FASE-2)
│   │   ├── QueryHandlers/
│   │   │   ├── GetPatientStateQueryHandler.cs ← NUEVO
│   │   │   └── ...4 handlers (ver FASE-2)
│   │   └── DTOs/
│   │       └── ...PatientStateDto, etc.
│   ├── WaitingRoom.API/
│   │   ├── Endpoints/
│   │   │   ├── PatientEndpoints.cs     ← REFACTORIZADO
│   │   │   └── ConsultingRoomEndpoints.cs ← NUEVO
│   │   ├── Hubs/
│   │   │   └── WaitingRoomHub.cs       ← REFACTORIZADO
│   │   └── Program.cs                  ← ACTUALIZADO
│   ├── WaitingRoom.Projections/
│   │   └── Handlers/
│   │       ├── PatientStateProjectionHandler.cs ← NUEVO
│   │       └── ConsultingRoomOccupancyProjectionHandler.cs ← NUEVO
│   └── WaitingRoom.Infrastructure/
│       ├── Persistence/
│       │   ├── IPatientRepository.cs    ← NUEVO
│       │   └── ...4+ repositorios
│       └── Messaging/
│           └── EventPublisher.cs       ← REFACTORIZADO

apps/backend/src/Tests/
├── WaitingRoom.Tests.Domain/
│   └── Aggregates/
│       ├── PatientAggregateTests.cs    ← NUEVO (ver FASE-4)
│       └── ConsultingRoomAggregateTests.cs ← NUEVO
├── WaitingRoom.Tests.Application/
│   ├── CommandHandlers/
│   │   ├── RegisterPatientCommandHandlerTests.cs ← NUEVO
│   │   └── ...11 tests (ver FASE-4)
│   └── QueryHandlers/
│       └── ...4 tests
└── WaitingRoom.Tests.Integration/
    └── PatientCommandHandlerIntegrationTests.cs ← NUEVO

apps/frontend/src/
├── app/
│   ├── reception/page.tsx              ← REFACTORIZADO (ver FASE-3)
│   ├── medical/page.tsx                ← REFACTORIZADO
│   ├── cashier/page.tsx                ← REFACTORIZADO
│   ├── display/page.tsx                ← REFACTORIZADO
│   ├── dashboard/page.tsx              ← REFACTORIZADO
│   └── consulting-rooms/page.tsx       ← REFACTORIZADO
├── domain/
│   └── patient/PatientState.ts         ← NUEVO
├── hooks/
│   ├── usePatientState.ts              ← NUEVO
│   ├── useWaitingPatients.ts           ← NUEVO
│   ├── useConsultingRoomOccupancy.ts   ← NUEVO
│   └── ...3+ hooks (ver FASE-3)
├── components/
│   ├── reception/
│   │   ├── PatientAssignment.tsx       ← NUEVO
│   │   └── PatientDetailForm.tsx       ← REFACTORIZADO
│   ├── cashier/
│   │   └── CashierQueue.tsx            ← NUEVO
│   ├── medical/
│   │   └── ConsultingRoomCard.tsx      ← NUEVO
│   └── display/
│       └── WaitingRoomDisplay.tsx      ← NUEVO
└── services/
    └── api/patient.ts                  ← REFACTORIZADO

apps/frontend/test/
├── components/
│   ├── reception/PatientAssignment.test.tsx ← NUEVO (ver FASE-4)
│   ├── cashier/CashierQueue.test.tsx   ← NUEVO
│   └── ...5+ tests
├── hooks/
│   ├── usePatientState.test.ts         ← NUEVO
│   └── ...3+ tests
└── e2e/
    └── patient-complete-flow.cy.ts     ← NUEVO

infrastructure/database/postgres/
├── init.sql                            ← ACTUALIZADO (ver FASE-1)
└── migrations/
    ├── 001-add-patient-centric-schema.sql ← NUEVO
    ├── 002-seed-consulting-rooms.sql   ← NUEVO
    └── 003-rebuild-projections.sql     ← NUEVO
```

---

## 🚀 Cómo Usar Este Plan

### Paso 1: Entender el Contexto (30 min)
```
Lee en orden:
1. RESUMEN-EJECUTIVO.md - Visión global
2. "Cambio arquitectónico" en FASE-1-DOMINIO-Y-BD.md - Antes vs Después
3. Timeline en RESUMEN-EJECUTIVO.md - Qué esperar
```

### Paso 2: Asignar Responsabilidades (por Fase)
```
Fase 1 (1 semana):
  - Lead: Arquitecto
  - Equipo: 1 Backend Developer + 1 DBA
  - Entrega: Agregados + Eventos + Proyecciones + Tests

Fase 2 (1 semana):
  - Lead: Tech Lead Backend
  - Equipo: 2 Backend Developers
  - Entrega: CQRS Handlers + Endpoints + SignalR

Fase 3 (1 semana):
  - Lead: Tech Lead Frontend
  - Equipo: 1-2 Frontend Developers
  - Entrega: Hooks + Componentes + Páginas

Fase 4 (2-3 días):
  - Lead: QA Engineer
  - Equipo: 1 Backend Dev (support) + 1 QA Engineer
  - Entrega: Tests E2E + Performance + Security

Fase 5 (1 semana):
  - Lead: DevOps / SRE
  - Equipo: DevOps + Tech Lead Backend
  - Entrega: ADRs + Migration + Deployment
```

### Paso 3: Ejecutar por Fases
```
SEMANA 1:
  - Kick-off meeting
  - FASE 1 completa
  - Code review + 40+ tests verdes

SEMANA 2:
  - FASE 2 completa
  - Code review + 30+ tests verdes

SEMANA 3:
  - FASE 3 completa
  - Code review + 25+ tests verdes

SEMANA 4:
  - FASE 4 completa (E2E + Performance)
  - FASE 5 comienza (ADRs + Migration)
  - UAT + Sign-off

SEMANA 5:
  - Canary 15% deployment
  - Canary 50% deployment
  - Full 100% deployment
  - Post-deploy monitoring 24/7
```

### Paso 4: Validar a Cada Paso
```
Después de Fase 1:
  ✅ Agregados funcionan correctamente
  ✅ Eventos se persisten
  ✅ 40+ tests verdes
  ✅ Schema SQL validado

Después de Fase 2:
  ✅ Todos los endpoints responden
  ✅ Comandos se ejecutan correctamente
  ✅ Proyecciones actualizadas
  ✅ 30+ integration tests verdes

Después de Fase 3:
  ✅ FE se conecta correctamente con BE
  ✅ Componentes se renderizan
  ✅ Real-time updates funcionan
  ✅ 25+ E2E tests verdes

Después de Fase 4:
  ✅ Load tests pasados (P95 < 2s)
  ✅ Security audit passed
  ✅ UAT sign-off

Después de Fase 5:
  ✅ Canary 15% estable 4 horas
  ✅ Canary 50% estable 8 horas
  ✅ Full 100% rollout
  ✅ Producción monitoreada
```

---

## 🎓 Convenciones y Decisiones Arquitécturales

Vea **FASE-2-5-BACKEND-FRONTEND-TESTING.md** sección "Fase 5: Deploy" para:
- ADR-001: Patient-Centric Aggregate Root
- ADR-002: Event Sourcing per Patient (not per Queue)
- ADR-003: ConsultingRoom as Secondary Aggregate
- ADR-004: Outbox Pattern for Reliable Publishing
- ADR-005: Projections as Denormalized Read Models

---

## 🔗 Enlaces Rápidos

### Checklist por Fase
- [Checklist Fase 1](FASE-1-DOMINIO-Y-BD.md#checklist-fase-1)
- [Checklist Fase 2](FASE-2-5-BACKEND-FRONTEND-TESTING.md#checklist-fase-2) (implícito en descripción)
- [Checklist Fase 3](FASE-2-5-BACKEND-FRONTEND-TESTING.md#checklist-fase-3) (implícito)
- [Checklist Fase 4](FASE-2-5-BACKEND-FRONTEND-TESTING.md#checklist-fase-4) (implícito)
- [Checklist Fase 5](FASE-2-5-BACKEND-FRONTEND-TESTING.md#checklist-fase-5)

### Secciones Técnicas Importantes
- [Patient Aggregate Completo](FASE-1-DOMINIO-Y-BD.md#agregado-patient)
- [Command Handlers Ejemplo](FASE-2-5-BACKEND-FRONTEND-TESTING.md#command-handlers)
- [Frontend Hooks Ejemplo](FASE-2-5-BACKEND-FRONTEND-TESTING.md#hooks-refactorizados)
- [E2E Tests Ejemplo](FASE-2-5-BACKEND-FRONTEND-TESTING.md#e2e-tests-cypress)

---

## ❓ Preguntas Frecuentes Rápidas

**P: ¿Cuánto tiempo toma completar esto?**  
R: 4-5 semanas con 2-3 personas

**P: ¿Perderemos datos?**  
R: No. Todos los eventos se migran. Hay rollback plan.

**P: ¿Necesito crear nuevas pantallas?**  
R: No. Adapta las existentes (* requerimiento estricto)

**P: ¿Cuántos tests debo crear?**  
R: ~171 tests (40 unit + 30 integration + 25 frontend + 8 E2E + extras)

**P: ¿Qué pasa si algo sale mal?**  
R: Rollback en 30 min. Backup + scripts preparados.

Más preguntas: Ver [FAQ en RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#preguntas-frecuentes-faq)

---

## 📞 Soporte

Si tienes dudas durante la implementación:

1. **Técnicas sobre Dominio/Arquitectura**: Consulta [FASE-1-DOMINIO-Y-BD.md](FASE-1-DOMINIO-Y-BD.md)
2. **Técnicas sobre CQRS/API/Frontend**: Consulta [FASE-2-5-BACKEND-FRONTEND-TESTING.md](FASE-2-5-BACKEND-FRONTEND-TESTING.md)
3. **Timeline/Planning**: Consulta [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)
4. **Decisiones de Arquitectura**: Ver ADRs en Fase 5
5. **Testing**: Ver sección Testing en ambos documentos

---

## ✅ Validación Pre-Implementación

Antes de comenzar, asegúrate que:

- [ ] Has leído RESUMEN-EJECUTIVO.md
- [ ] Entiendes el cambio de "Queue-centric" a "Patient-centric"
- [ ] Tienes acceso al repositorio
- [ ] Docker está instalado
- [ ] .NET SDK 10 está instalado
- [ ] Node.js está instalado
- [ ] Base de datos PostgreSQL está disponible
- [ ] Tu equipo ha visto la presentación de arquitectura
- [ ] Tienes leadership buy-in (PM + CTO)

---

**Documento creado**: 2026-03-19  
**Última actualización**: 2026-03-19  
**Versión**: 1.0 - COMPLETE  
**Estado**: ✅ READY TO IMPLEMENT

---

**Para comenzar**: Lee [📋 RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)
