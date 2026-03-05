# Arquitectura real del proyecto

Este directorio contiene únicamente documentación arquitectónica vigente y alineada con el código actual del repositorio.

## Estado actual verificado

- Backend: .NET 10 (ASP.NET Minimal API + Worker)
- Frontend: Next.js 16 + React 19
- Persistencia: PostgreSQL (Event Store + Outbox)
- Mensajería: RabbitMQ
- Observabilidad: Prometheus + Grafana + Serilog

## Documento canónico

- `../AUDITORIA_TECNICA_2026-02-27.md`

## Principios detectados

- Hexagonal Architecture
- Event Sourcing
- CQRS
- Outbox Pattern

## Nota de gobernanza

Los documentos que no reflejaban exactamente el comportamiento actual del código fueron eliminados o reemplazados durante la regeneración documental del 27 de febrero de 2026.
