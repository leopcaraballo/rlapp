# Restricciones de Stack Tecnológico

## Backend aprobado

- Java 21
- Spring Boot 3.x
- Spring WebFlux (programación reactiva)
- Spring Data R2DBC
- Reactor Core

## Persistencia aprobada

- PostgreSQL 15+
- Acceso reactivo mediante R2DBC

## API y contratos

- API REST JSON sobre HTTP
- Versionado por ruta (`/api/v1/...`)
- Códigos HTTP estándar (`201`, `400`, `404`, `409`, `500`)

## Tecnologías/librerías no aprobadas para este proyecto

- Programación bloqueante para casos de uso del backend reactivo (ej. JPA/Hibernate bloqueante en flujos WebFlux)
- Frameworks adicionales de servidor fuera del stack Spring definido
- Motores NoSQL no homologados para el dominio de productos

## Restricciones de diseño y antipatrones prohibidos

- No usar singletons globales para estado mutable compartido.
- No mezclar acceso bloqueante y reactivo en el mismo caso de uso.
- No exponer errores internos de infraestructura en respuestas públicas.

## Capacidades y límites relevantes

- Operaciones CRUD de catálogo son viables con el stack actual.
- Validaciones de campos obligatorios y unicidad de `code` son soportadas.
- Timestamps automáticos (`createdAt`, `updatedAt`) son soportados a nivel aplicación o persistencia.
