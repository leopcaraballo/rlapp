Verificar asegura que el código se construya correctamente (funcione técnicamente) mediante pruebas unitarias rápidas. Validar confirma que el software construido cumple con las necesidades del cliente (funcionalidad correcta), a menudo a través de pruebas de aceptación (AcambiarTDD)

# Exposición del uso de TDD en RLAPP

> Documento ejecutivo y técnico para presentar cómo se aplicó TDD en el proyecto, con evidencia verificable y límites metodológicos explícitos.

---

## 1. Objetivo de la exposición

Presentar de forma clara, defendible y auditable:

- Cómo se aplicó TDD en backend y frontend.
- Qué evidencias demuestran ejecución real de pruebas.
- Qué parte de la afirmación metodológica es concluyente y qué parte no lo es.
- Qué acciones ya se adoptaron para fortalecer trazabilidad Red-Green-Refactor.

## 2. Contexto del proyecto

### 2.1 Arquitectura y alcance

RLAPP es un sistema de gestión de sala de espera médica con arquitectura hexagonal, Event Sourcing, CQRS y patrón Outbox.

Stack principal:

- Backend: .NET 10 (ASP.NET Core Minimal API).
- Frontend: Next.js 16 + React 19.
- Persistencia: PostgreSQL 16.
- Mensajería: RabbitMQ 3.x.

### 2.2 Por qué TDD es crítico en este dominio

En un dominio clínico, TDD aporta control de regresión y trazabilidad sobre reglas sensibles:

- Identidad de paciente.
- Idempotencia de registro.
- Seguridad operativa por rol.
- Consistencia de eventos y proyecciones.

## 3. Cómo se aplicó TDD en RLAPP

### 3.1 Ciclo Red-Green-Refactor aplicado

- Red: definición o ajuste de pruebas para capturar reglas faltantes o defectos observables.
- Green: implementación mínima para pasar pruebas sin sobre-ingeniería.
- Refactor: mejora de diseño y legibilidad sin cambiar comportamiento funcional.

### 3.2 Combinación con BDD y AAA

La implementación de TDD se reforzó con:

- BDD (Given-When-Then) para expresar reglas de negocio.
- AAA (Arrange-Act-Assert) para pruebas legibles y mantenibles.

### 3.3 Diferencia entre verificar y validar

- Verificar: confirmar que el software está construido correctamente a nivel técnico.
  - Ejemplos: pruebas unitarias, integración, invariantes, idempotencia, contratos de API.
- Validar: confirmar que el software resuelve la necesidad del negocio clínico.
  - Ejemplos: conflicto de identidad, restricción por rol, generación de `queueId`, flujo de check-in esperado.

## 4. Evidencia consolidada de uso de TDD

### 4.1 Evidencia de ejecución de pruebas

A partir de la documentación auditada, se registran corridas con alta consistencia:

- Suite total reportada: 143/143 pruebas exitosas.
- Distribución reportada: Domain (92), Application (12), Projections (10), Integration (29).
- En reportes complementarios aparece una variación documental de 142/143.

Interpretación técnica:

- La ejecución extensiva de pruebas está demostrada.
- La diferencia 142/143 se registra como variación documental y no invalida la tendencia de pass rate alto.

### 4.2 Evidencia de escenarios de negocio críticos

Escenarios con evidencia de cobertura:

- Conflicto clínico por identidad divergente de paciente.
- Denegación de operación cuando el rol de recepción no es válido.
- Generación de `queueId` desde backend.
- Idempotencia ante reintentos del mismo registro.

### 4.3 Evidencia de calidad técnica asociada

Resultados focales reportados:

- `CheckInPatientCommandHandler`: 95.65%.
- `ReceptionistOnlyFilter`: 81.82%.
- `ExceptionHandlerMiddleware`: 94.12%.
- `PostgresPatientIdentityRegistry`: 96.55%.

## 5. Qué se puede afirmar con certeza

### 5.1 Afirmaciones sólidas

- Existe evidencia real de ejecución de pruebas robustas, especialmente en backend.
- Existe evidencia de prácticas TDD/BDD en áreas críticas del dominio clínico.
- El sistema muestra comportamiento consistente en idempotencia, integridad de eventos y defensa frente a condiciones de carrera.

### 5.2 Límites de la evidencia

- No es metodológicamente correcto afirmar TDD estricto al 100% por feature con la trazabilidad disponible en la auditoría puntual.
- La reconstrucción completa del orden test-first por cada cambio queda limitada por compresión histórica en parte del backend.
- En frontend, la ejecución E2E no siempre es continua en cada corrida por condicionamiento de entorno.

## 6. Actualizaciones implementadas para fortalecer trazabilidad

### 6.1 Plantilla estándar por PR

Se incorporó una plantilla operativa para evidenciar Red-Green-Refactor por pull request:

- Archivo: [docs/TEMPLATE_EVIDENCIA_TDD_PR.md](docs/TEMPLATE_EVIDENCIA_TDD_PR.md)
- Enfoque: separar explícitamente verificación técnica y validación funcional.
- Beneficio: mayor auditabilidad para comités técnicos y de cumplimiento.

### 6.2 Convención recomendada de commits

Para mejorar evidencia cronológica de TDD:

- `test:` prueba en rojo.
- `feat:` o `fix:` paso a verde.
- `refactor:` mejora sin cambio de comportamiento.

## 7. Guion sugerido para exposición (3 a 5 minutos)

### 7.1 Apertura (30 segundos)

"En RLAPP aplicamos TDD para proteger reglas clínicas críticas. Nuestra exposición distingue entre resultados técnicamente verificables y afirmaciones metodológicas que requieren trazabilidad más fina."

### 7.2 Núcleo técnico (2 minutos)

- Se ejecutaron suites amplias con pass rate alto y cobertura focal en componentes críticos.
- Las pruebas cubren identidad clínica, idempotencia, control por rol y consistencia de eventos.
- La práctica se reforzó con BDD y estructura AAA para trazabilidad funcional.

### 7.3 Transparencia metodológica (1 minuto)

- Podemos afirmar con certeza testing robusto con prácticas TDD/BDD aplicadas en áreas críticas.
- No afirmamos TDD estricto universal sin evidencia commit-a-commit de Red-Green-Refactor para cada feature.

### 7.4 Cierre (30 segundos)

"La organización ya cuenta con una plantilla estándar por PR para elevar trazabilidad y convertir la evidencia TDD en un activo auditable de forma sostenida."

## 8. Mensaje ejecutivo final

Estado defendible para stakeholders:

- "RLAPP presenta un nivel alto de madurez en pruebas y aplica TDD/BDD en componentes críticos del dominio clínico."
- "La evidencia de ejecución es sólida; la evidencia forense de TDD estricto por feature continúa fortaleciéndose con la nueva plantilla de trazabilidad por PR."

## 9. Fuentes de evidencia

- [reports/INFORME_TDD_REAL.md](reports/INFORME_TDD_REAL.md)
- [docs/REPORTE_FINAL_VALIDACION_2026-03-01.md](docs/REPORTE_FINAL_VALIDACION_2026-03-01.md)
- [rlapp-backend/docs/TDD_BDD_IMPACT_REPORT_2026-02-27.md](rlapp-backend/docs/TDD_BDD_IMPACT_REPORT_2026-02-27.md)
- [rlapp-backend/docs/TESTING.md](rlapp-backend/docs/TESTING.md)
- [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)
