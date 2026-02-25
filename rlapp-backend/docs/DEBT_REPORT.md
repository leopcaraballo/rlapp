# Debt report

## Proposito

Este documento consolida hallazgos, deuda tecnica y acciones pendientes del backend. Debe mantenerse actualizado y verificable.

## Reglas de uso

- Cada item debe tener estado, impacto y responsable.
- Evitar duplicados. Consolidar en un unico item cuando aplique.
- Cerrar un item solo con evidencia verificable.

## Estado actual

No se registran hallazgos pendientes al momento de la inicializacion.

## Items

- ID: DR-000
  Titulo: Inicializacion de reporte de deuda tecnica
  Estado: Done
  Severidad: Low
  Impacto: Ninguno
  Responsable: IA
  Evidencia: Creacion del archivo en rlapp-backend/docs
  Fecha: 2026-02-24

- ID: DR-001
  Titulo: Duplicacion de reproyeccion post-comando en API
  Estado: Done
  Severidad: Medium
  Impacto: Aumentaba acoplamiento y riesgo de inconsistencia en endpoints de escritura
  Responsable: IA
  Evidencia: Extraccion a helper comun en Program.cs y uso unificado en endpoints POST
  Fecha: 2026-02-25

- ID: DR-002
  Titulo: Validacion inconsistente de DTOs en borde HTTP
  Estado: Done
  Severidad: High
  Impacto: Permitía entradas invalidas antes de llegar a capa de aplicacion/dominio
  Responsable: IA
  Evidencia: DataAnnotations en DTOs + RequestValidationFilter aplicado de forma transversal
  Fecha: 2026-02-25

- ID: DR-003
  Titulo: Secretos hardcodeados en configuracion backend
  Estado: Done
  Severidad: High
  Impacto: Riesgo de exposicion de credenciales en codigo versionado
  Responsable: IA
  Evidencia: Limpieza de ConnectionStrings y credenciales RabbitMQ en appsettings de API/Worker
  Fecha: 2026-02-25

- ID: DR-004
  Titulo: Rebuild asincrono acoplado a token HTTP
  Estado: Done
  Severidad: Medium
  Impacto: Riesgo de cancelacion prematura y baja observabilidad de errores
  Responsable: IA
  Evidencia: Uso de ApplicationStopping y registro de errores en WaitingRoomQueryEndpoints
  Fecha: 2026-02-25
