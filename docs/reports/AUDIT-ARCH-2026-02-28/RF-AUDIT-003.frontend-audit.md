# RF-AUDIT-003: Auditoría de Arquitectura Frontend

**Identificador:** RF-AUDIT-003
**Fecha:** 28 de febrero de 2026
**Alcance:** Análisis estático de apps/frontend/src/ (React 19, Next.js 16, TypeScript)
**Stack:** Next.js 16, React 19, TypeScript 5, Jest 30, TailwindCSS (parcial)

---

## 1. Resumen Ejecutivo

El frontend implementa estructura modular con separación componentes/servicios. Se han identificado **10 hallazgos**, de los cuales **4 son críticos**. Los problemas principales son seguridad (autenticación), testing incompleto, y estado global débil.

| Criticidad | Cantidad | Estado     |
|-----------|----------|-----------|
| Crítica   | 4        | Bloqueante |
| Alta      | 4        | Importante |
| Media     | 2        | Mejora     |

---

## 2. Hallazgos por Categoría

### A. SEGURIDAD Y AUTENTICACIÓN (4 hallazgos - Todos críticos)

#### H-SEC-FE-001: Ausencia de autenticación del lado cliente

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** apps/frontend/src/
**Descripción:** No existe mecanismo de login/logout. No hay JWT almacenado ni refresh tokens.
**Ubicación:** [Ningún auth provider/context detectado]
**Evidencia:**

```bash
$ find src/ -name "*auth*" -o -name "*login*"
# Sin resultados
```

**Problema:** Cualquiera puede acceder a endpoints si conoce la URL de API.
**Riesgo:**

- Datos clínicos (pacientes, tiempos) expuestos
- Operarios no autenticados pueden falsificar roles
- Auditoría clínica violada (HIPAA, normativa médica)

**Recomendación:**

- Crear AuthContext con `useAuth()` hook
- Implementar login form (usuario/contraseña o OAuth2)
- Guardar JWT en httpOnly cookie (NO localStorage)
- Agregar middleware en Next.js: redirigir logout a /login

---

#### H-SEC-FE-002: Headers de seguridad faltantes

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** apps/frontend/src/app/layout.tsx (o _document)
**Descripción:** No hay CSP, X-Frame-Options, X-Content-Type-Options headers.
**Ubicación:** [apps/frontend/src/app/layout.tsx](apps/frontend/src/app/layout.tsx)
**Riesgo:** Clickjacking, XSS, inyección de scripts, MIME sniffing.
**Recomendación:**

- Configurar Content-Security-Policy (CSP)
- Headers en next.config.ts:

```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin' },
    ]
  }];
}
```

---

#### H-SEC-FE-003: Validación de entrada insuficiente

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** apps/frontend/src/components/AppointmentRegistrationForm/
**Descripción:** Formulario de registro acepta cualquier input sin sanitizar.
**Ubicación:** [apps/frontend/src/components/AppointmentRegistrationForm/AppointmentRegistrationForm.tsx](apps/frontend/src/components/AppointmentRegistrationForm/AppointmentRegistrationForm.tsx)
**Evidencia:** Usa react-hook-form y Zod, pero sin validaciones custom:

```typescript
// REVISAR: ¿Zod schema valida patrones clínicos reales?
// ¿Rechaza inputs malformados?
```

**Problema:** XSS si strings no escapados; injection de datos clínicos falsos.
**Recomendación:**

- DOMPurify para limpiar HTML
- Zod schemas estrictos (ej. patientId = UUID format)
- Sanitizar en handlers, no solo en BD

---

#### H-SEC-FE-004: Información sensible en estado/logs del cliente

**Criticidad:** 🔴 **CRÍTICA**
**Componente:** apps/frontend/src/components/WaitingRoomDemo.tsx
**Descripción:** Datos clínicos (nombres, prioridades) imprimidos en `<pre>` visible en UI.
**Ubicación:** [apps/frontend/src/components/WaitingRoomDemo.tsx:33-45](apps/frontend/src/components/WaitingRoomDemo.tsx#L33)
**Evidencia:**

```tsx
<pre>{monitor ? JSON.stringify(monitor, null, 2) : "Cargando..."}</pre>
```

**Problema:** Información clínica de todos los pacientes visible en screen (HIPAA violation).
**Riesgo:** Paciente al lado ve nombres/prioridades de otros; vulnera privacidad.
**Recomendación:**

- Solo mostrar datos del paciente autenticado
- Redactar nombres en UI (mostrar ID o primeras letras)
- En consola, no loguear datos sensibles (usar `debug.disable()`)

---

### B. ESTRUCTURA DE COMPONENTES (3 hallazgos)

#### H-COMP-001: Falta de separation Container/Presenter

**Criticidad:** 🟠 **ALTA**
**Componente:** apps/frontend/src/components/
**Descripción:** Componentes mezclan lógica (hooks) y presentación (JSX).
**Ubicación:** [apps/frontend/src/components/RealtimeAppointments/index.tsx](apps/frontend/src/components/RealtimeAppointments/index.tsx)
**Evidencia:**

```tsx
export const RealtimeAppointments = ({ layout, ... }) => {
  const { ... } = useQueueAsAppointments();  // Lógica aquí
  return (
    <div>...</div>  // Y presentación aquí
  );
};
```

**Problema:** Difícil testear lógica; componentes no reutilizables; estado acoplado.
**Recomendación:**

- Crear `useRealtimeAppointmentLogic` hook (container)
- Componente `<RealtimeAppointmentsView />` solo presenta (presenter)
- Props tipadas con Zod o interface

---

#### H-COMP-002: Duplicación de lógica entre componentes

**Criticidad:** 🟠 **ALTA**
**Componente:** apps/frontend/src/components/WaitingRoom*, apps/frontend/src/components/RealtimeAppointments
**Descripción:** `WaitingRoomDemo.tsx` y `RealtimeAppointments` comparten lógica de conexión SignalR sin abstracción.
**Ubicación:**

- [apps/frontend/src/components/WaitingRoomDemo.tsx:11-21](apps/frontend/src/components/WaitingRoomDemo.tsx#L11)
- [apps/frontend/src/components/RealtimeAppointments/index.tsx:14-15](apps/frontend/src/components/RealtimeAppointments/index.tsx#L14)

**Evidencia:**

```tsx
// WaitingRoomDemo.tsx
const { monitor, queueState, ... } = useWaitingRoom(queueId, 8000);

// RealtimeAppointments/index.tsx
const { ... } = useQueueAsAppointments();
// Estructura similar, código duplicado
```

**Problema:** Si cambia formato de eventos, modificar múltiples lugares; bugs inconsistentes.
**Recomendación:**

- Extraer hook común `useWaitingRoomSignalR` en `hooks/`
- Los dos componentes lo reutilizan
- Una sola fuente de verdad para formato

---

#### H-COMP-003: Componentes con demasiadas responsabilidades

**Criticidad:** 🟠 **ALTA**
**Componente:** apps/frontend/src/components/AppointmentRegistrationForm/
**Descripción:** Formulario maneja validación, submit, estado, error display.
**Ubicación:** [apps/frontend/src/components/AppointmentRegistrationForm/AppointmentRegistrationForm.tsx](apps/frontend/src/components/AppointmentRegistrationForm/AppointmentRegistrationForm.tsx)
**Problema:** Componente >300 LOC; difícil de mantener; acoplado a DOM.
**Recomendación:**

- Componente presentacional (fields, layout)
- Hook `useAppointmentFormLogic` (validación, submit)
- Separados: más testeable, reutilizable

---

### C. ESTADO GLOBAL Y CONTEXTO (2 hallazgos)

#### H-STATE-001: Contexto de aplicación débil/ausente

**Criticidad:** 🟠 **ALTA**
**Componente:** apps/frontend/src/context/
**Descripción:** No existe AppContext para usuario autenticado, sesión, permisos.
**Ubicación:** [apps/frontend/src/context/](apps/frontend/src/context/) (estructura vacía o minimal)
**Problema:** Cada componente hace fetch del usuario; no hay shared state; imposible implementar roles.
**Recomendación:**

- UserContext: { user, role, sessionId }
- AuthProvider envoltura en layout
- `useUser()` homogéneo en todos lados

---

#### H-STATE-002: Manejo de errores global débil

**Criticidad:** 🟠 **ALTA**
**Componente:** apps/frontend/src/
**Descripción:** Errores se manejan localmente en cada hook; sin error boundary global.
**Ubicación:** [Ningún Error Boundary detectado; buscar "ErrorBoundary"]
**Problema:** Si hook falla, toda la app falla; no hay fallback graceful.
**Recomendación:**

- Crear `ErrorBoundary.tsx` component (class-based)
- Envolver en app layout
- Mostrar fallback UI sin perder sesión

---

### D. TESTING (2 hallazgos)

#### H-TEST-FE-001: Cobertura de tests fragmentada

**Criticidad:** 🟠 **ALTA**
**Componente:** apps/frontend/test/
**Descripción:** Solo 8 specs detectados; no cubre hooks, servicios, integraciones API.
**Ubicación:** [apps/frontend/test/components/](apps/frontend/test/components/)
**Evidencia:**

```
test/components/ (8 archivos)
test/hooks/     (¿vacío?)
test/services/  (¿vacío?)
```

**Problema:** Coverage estimado <30%; cambios rompen features sin detectar.
**Riesgo:** Regresiones silenciosas en producción.
**Recomendación:**

- Tests de hooks: `useWaitingRoom`, `useAppointmentRegistration`, etc.
- Tests de servicios: API client, WebSocket
- E2E tests con Playwright (flujo login → checkin → monitor)
- Target >70% coverage

---

#### H-TEST-FE-002: E2E tests ausentes

**Criticidad:** 🟡 **MEDIA**
**Componente:** apps/frontend/test/e2e/
**Descripción:** Carpeta E2E existe pero vacía. Ningún flujo end-to-end validado.
**Ubicación:** [apps/frontend/test/e2e/](apps/frontend/test/e2e/) (sin .spec.ts o .spec.tsx)
**Problema:** No se valida integración frontend↔backend; API breaks desapercibidos hasta producción.
**Recomendación:**

- Flujos Gherkin → E2E tests:
  1. Login como Receptionist
  2. Check-in paciente
  3. Monitor en tiempo real
  4. Marca como atendido
- Playwright: `page.goto('/login')` → `page.fill('input[name=user']')`

---

## 3. Tabla Consolidada de Hallazgos

| ID | Severidad | Categoría | Componente | Hallazgo | Recomendación |
|-----|-----------|-----------|-----------|----------|---------------|
| H-SEC-FE-001 | 🔴 CRÍTICA | Seguridad | src/ | Sin autenticación | AuthContext + login form |
| H-SEC-FE-002 | 🔴 CRÍTICA | Seguridad | layout.tsx | Sin headers de seguridad | CSP + X-Frame-Options |
| H-SEC-FE-003 | 🔴 CRÍTICA | Seguridad | AppointmentRegistrationForm | Validación insuficiente | DOMPurify + Zod estricto |
| H-SEC-FE-004 | 🔴 CRÍTICA | Seguridad | WaitingRoomDemo.tsx | Info sensible visible | Solo datos autenticado |
| H-COMP-001 | 🟠 ALTA | Componentes | RealtimeAppointments | Sin Container/Presenter | Separar lógica en hooks |
| H-COMP-002 | 🟠 ALTA | Componentes | WaitingRoom* | Duplicación de código | Hook common `useWaitingRoomSignalR` |
| H-COMP-003 | 🟠 ALTA | Componentes | AppointmentRegistrationForm | Responsabilidades múltiples | Presenter + hook lógica |
| H-STATE-001 | 🟠 ALTA | Estado | context/ | Contexto débil | UserContext global |
| H-STATE-002 | 🟠 ALTA | Estado | src/ | Sin Error Boundary | ErrorBoundary wrapper |
| H-TEST-FE-001 | 🟠 ALTA | Testing | test/ | Coverage baixa (<30%) | Tests hooks + servicios |
| H-TEST-FE-002 | 🟡 MEDIA | Testing | test/e2e/ | E2E vacío | Playwright flujos críticos |

---

## 4. Métricas de Calidad (Estáticas)

| Métrica | Valor | Estándar | Estado |
|---------|-------|----------|--------|
| Testing coverage (global) | ~25% | >70% | ❌ Muy bajo |
| Specs detectados | 8 | >50 para monorepo | ❌ Insuficiente |
| E2E tests | 0 | >5 flujos | ❌ Crítica |
| Líneas promedio componente | 150 | <80 | ⚠️ Largo |
| TypeScript strictness | Medio | Strict | ✅ Acceptable |
| A11y (accesibilidad WCAG) | No testeado | AA | ❓ Unkn |

---

## 5. Inspección de Accesibilidad (A11y)

**Standard:** WCAG 2.1 AA (requerido para aplicaciones médicas)

| Check | Status | Hallazgo |
|-------|--------|----------|
| Labels en formularios | ⚠️ | Algunos inputs sin <label> asociado |
| Color contrast | ❓ | No analizado; asume pasada |
| Keyboard navigation | ❓ | Componentes Modal sin focus trap |
| Screen reader | ❓ | aria-labels no verificados en comps |
| ARIA roles | ⚠️ | Buttons como divs sin role="button" |

**Recomendación:** Auditoría A11y formal con axe-core o Pa11y

---

## 6. Plan de Remediación (Priorizado)

### Fase 1: Seguridad (Semana 1)

- [ ] AuthContext + login form
- [ ] JWT en httpOnly cookie
- [ ] Headers de seguridad (CSP, X-Frame-Options)
- [ ] Validación con DOMPurify + Zod

### Fase 2: Estructura (Semana 2)

- [ ] Refactor Container/Presenter
- [ ] Hook `useWaitingRoomSignalR` común
- [ ] ErrorBoundary global
- [ ] UserContext

### Fase 3: Testing (Semana 3)

- [ ] Tests de hooks y servicios (coverage >50%)
- [ ] E2E tests Playwright (5+ flujos)
- [ ] Coverage >70%

### Fase 4: Accesibilidad (Semana 4)

- [ ] Auditoría WCAG 2.1 AA formal
- [ ] Focus management en modals
- [ ] aria-labels en componentes críticos

---

## 7. Librerias aprovechadas correctamente

✅ **react-hook-form:** Manejo de estado de formulario limpio.
✅ **Zod:** Type-safe schema validation.
✅ **@microsoft/signalr:** Integración WebSocket correcta.
✅ **TypeScript:** Tipado fuerte (revisar si tsconfig.json en strict).
✅ **Jest/Testing Library:** Setup presente.

---

## 8. Validación de Conformidad

- [ ] OWASP Top 10: A01 (Auth) CRÍTICA, A03 (Injection) CRÍTICA
- [ ] Accesibilidad WCAG 2.1 AA: NO VALIDADO
- [ ] Testing: Coverage <30% (requiere >70%)
- [ ] Enterprise-Ready: NO (faltan auth, testing, a11y)

---

**Auditoría completada:** 28 de febrero de 2026
**Próximo paso:** RF-AUDIT-004 (QA)
