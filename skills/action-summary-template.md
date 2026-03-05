# Action Summary Template

> **Instruction:** Every Sub-agent (SA) MUST deliver this summary to the Orchestrator upon task completion. The Orchestrator will integrate ONLY this summary into its history, discarding the intermediate reasoning. Note: The output MUST be written in Spanish.

---

## Action Summary

- **Item:** `[DEBT_REPORT ID, e.g. A-01]`
- **Skill:** `[skill used, e.g. backend-api]`
- **AO Model:** `[orchestrator model, e.g. Claude Opus 4.6]`
- **SA Model:** `[sub-agent model, e.g. GPT-5.1-Codex-Max]`
- **Recommended Model:** `[optimal model for this task according to section 2, e.g. Claude Sonnet 4.6 (Tier 2) — unit tests, medium complexity]`
- **Files Changed:**
  - `path/to/file1.ts` — [brief description of change in Spanish]
  - `path/to/file2.ts` — [brief description of change in Spanish]
- **What Was Done:** [1-2 sentences describing the action taken in Spanish]
- **What to Validate:**
  - [ ] [Test command or manual verification in Spanish]
  - [ ] [Second verification if applicable in Spanish]
- **HUMAN CHECK Added:** [Sí/No — if yes, list locations]
- **Breaking Changes:** [Sí/No — if yes, describe impact in Spanish]

---

## Completed Example

- **Item:** `A-01`
- **Skill:** `backend-api`
- **AO Model:** `Claude Opus 4.6`
- **SA Model:** `GPT-5.1-Codex-Max`
- **Recommended Model:** `GPT-5.1-Codex (Tier 1) — logica de dominio con idempotencia, complejidad alta`
- **Files Changed:**
  - `backend/consumer/src/appointments/turnos.service.ts` — Added idempotency check using `findOne` before `create`
  - `backend/consumer/src/schemas/appointment.schema.ts` — Added unique compound index on `{ idCard, createdAt }`
- **What Was Done:** Implementada guardia de idempotencia en creación de citas para prevenir duplicados durante redelivery de RabbitMQ.
- **What to Validate:**
  - [ ] `cd backend/consumer && npm run test`
  - [ ] Enviar mensaje duplicado via RabbitMQ management UI → verificar que no haya entrada duplicada
- **HUMAN CHECK Added:** Sí — `turnos.service.ts:45` (idempotency window logic)
- **Breaking Changes:** No
