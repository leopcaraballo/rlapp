# Gobernanza documental posterior a auditoría

Fecha: 27 de febrero de 2026

## 1. Alcance

Esta gobernanza documenta el resultado de la depuración y regeneración documental basada exclusivamente en el código actual del repositorio.

## 2. Lista de documentación eliminada (con motivo)

1. `rlapp-backend/READMEBACKEND.md`
   Motivo: documento masivo, redundante con README principal y con secciones no verificables en la base de código vigente.

2. `rlapp-frontend/FEEDBACK_ESTEBAN_RODRIGUEZ.md`
   Motivo: documento de feedback puntual, no canónico y sin valor operativo/documental del estado actual.

3. `docs/ORCHESTRATOR_SETUP.md`
   Motivo: guía operativa de orquestación no vinculada al comportamiento funcional del sistema en producción.

4. `docs/ORCHESTRATION_BLUEPRINT.md`
   Motivo: blueprint genérico de agentes, no describe la implementación real del producto.

5. `docs/architecture/ADR-001.md` a `docs/architecture/ADR-005.md`
   Motivo: decisiones históricas incompatibles con el stack y arquitectura real observada en código.

## 3. Lista de documentación actualizada

1. `docs/agent-context/PROJECT_CONTEXT.md`
   Cambio: corregido stack y topología a .NET + PostgreSQL + RabbitMQ + Next.js.

2. `rlapp-backend/README.md`
   Cambio: reemplazado por versión alineada a módulos reales, endpoints reales y estado real de seguridad.

3. `rlapp-frontend/README.md`
   Cambio: reemplazado por versión alineada a runtime real (REST polling + SignalR), rutas reales y configuración efectiva.

4. `docs/architecture/README.md`
   Cambio: convertido en índice vigente hacia documentación canónica del estado real.

## 4. Lista de documentación creada

1. `docs/AUDITORIA_TECNICA_2026-02-27.md`
   Contenido: auditoría técnica completa, clasificación de features, faltantes, riesgos, deuda, código muerto y mejoras.

2. `docs/GOBERNANZA_DOCUMENTAL_2026-02-27.md` (este documento)
   Contenido: trazabilidad de limpieza documental y control de consistencia.

## 5. Gap analysis: arquitectura actual vs arquitectura recomendada

### 5.1 Estado actual

- Arquitectura sólida de dominio y persistencia de eventos.
- Pipeline asíncrono con Outbox + Worker + RabbitMQ.
- Consultas basadas en proyecciones in-memory.
- Frontend funcional por dominios operativos.

### 5.2 Arquitectura recomendada

1. **Seguridad de acceso**
   - Actual: sin authentication ni authorization.
   - Recomendado: JWT/OIDC + políticas por rol/capacidad.

2. **Resiliencia de lectura**
   - Actual: read models in-memory (volátiles).
   - Recomendado: read models persistidos (PostgreSQL).

3. **Protección de tráfico backend**
   - Actual: sin rate limiting en API.
   - Recomendado: rate limiting por ruta, actor y burst control.

4. **Canal realtime**
   - Actual: hub presente con integración parcial en eventos push.
   - Recomendado: contratos de eventos versionados y pruebas de compatibilidad.

5. **Consistencia de infraestructura frontend**
   - Actual: coexistencia de adapters duplicados + middleware con nombre no estándar.
   - Recomendado: consolidar adapters y adoptar `middleware.ts` oficial.

## 6. Checklist priorizado de mejora

Prioridad P1:

- [ ] Implementar `AuthenticationModule` en backend.
- [ ] Implementar `AuthorizationModule` con políticas por endpoint.
- [ ] Implementar `BackendRateLimitingModule`.

Prioridad P2:

- [ ] Implementar `PersistentProjectionStore` y migrar consultas críticas.
- [ ] Formalizar contratos SignalR y emitir eventos consistentes.
- [ ] Corregir middleware frontend a convención oficial (`middleware.ts`).

Prioridad P3:

- [ ] Unificar capa de adapters HTTP/realtime frontend.
- [ ] Endurecer CI frontend para garantizar ejecución real de suites y cobertura.
- [ ] Revisar y recortar documentación residual no canónica en subcarpetas de backend/docs.

## 7. Estado de cierre

Se dispone de una línea documental canónica sustentada en evidencia de código para arquitectura, flujos, módulos, riesgos, deuda y roadmap técnico. La siguiente iteración recomendada es ejecutar la depuración fina de `rlapp-backend/docs/**` para converger toda la documentación histórica a un único set operativo vigente.

## 8. Fase 2 ejecutada: depuración de `rlapp-backend/docs/**`

En esta segunda fase se ejecutó la convergencia completa del árbol documental del backend:

- Se eliminó documentación legacy en:
  - `rlapp-backend/docs/architecture/**`
  - `rlapp-backend/docs/compliance/**`
  - `rlapp-backend/docs/governance/**`
- Se reemplazaron los documentos troncales por versiones canónicas:
  - `rlapp-backend/docs/ARCHITECTURE.md`
  - `rlapp-backend/docs/API.md`
  - `rlapp-backend/docs/TESTING.md`
  - `rlapp-backend/docs/OPERATING_MODEL.md`
  - `rlapp-backend/docs/DEBT.md`
  - `rlapp-backend/docs/PR_AUDIT_CHECKLIST.md`
- Se creó índice canónico del directorio:
  - `rlapp-backend/docs/README.md`

Resultado: `rlapp-backend/docs` quedó reducido a documentación operativa vigente, sin capas históricas paralelas ni duplicidad semántica.

## 9. Fase 3 ejecutada: convergencia final de `docs` raíz

En esta fase se eliminó el remanente no operativo de arquitectura raíz:

- Eliminado: `docs/architecture/templates/ADR-template.md`

Resultado: el árbol `docs` conserva únicamente documentos con función operativa o trazabilidad real sobre el estado actual del sistema.
