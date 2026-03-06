# Guía de contribución

## Requisitos previos

- .NET SDK 10.0+
- Node.js 20+
- Docker y Docker Compose v2
- Git

## Flujo de trabajo

### 1. Preparación del entorno

```bash
# Levantar infraestructura local
make infra-up

# Instalar dependencias del frontend
cd apps/frontend && npm ci
```

### 2. Ramas

Este proyecto sigue GitFlow:

| Rama | Propósito |
|---|---|
| `main` | Producción estable |
| `develop` | Integración continua |
| `feature/<nombre>` | Nuevas funcionalidades |
| `fix/<nombre>` | Corrección de errores |
| `release/<versión>` | Preparación de releases |

### 3. Commits

Este proyecto usa **Conventional Commits**. El formato es:

```
<tipo>(<alcance>): <descripción en español>
```

Tipos válidos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

Ejemplos:

```
feat(reception): agregar validación de documento duplicado
fix(worker): corregir reintento de outbox en error de red
test(domain): agregar pruebas de invariantes del agregado
```

### 4. Proceso de pull request

1. Crear rama desde `develop`
2. Implementar cambios siguiendo los patrones de arquitectura
3. Ejecutar `make test` y asegurarse que todo pase
4. Ejecutar `make lint` sin errores
5. Abrir PR hacia `develop` con descripción clara

### 5. Reglas de código

- Backend: SOLID, DRY, KISS, Hexagonal Architecture, Event Sourcing
- Frontend: separación de capas (domain / application / infrastructure)
- Sin `any` en TypeScript
- Cobertura de pruebas mayor al 80%
- Todo comentario significativo en español formal

### 6. Estructura del monorepo

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para la descripción completa de la estructura.

### 7. Comandos útiles

```bash
make help           # Muestra todos los comandos disponibles
make dev            # Levanta el stack completo
make test           # Ejecuta todos los tests
make lint           # Linter en todo el monorepo
make backend-test   # Solo tests .NET
make frontend-test  # Solo tests Jest
make logs           # Logs de todos los servicios
make clean          # Limpia artefactos y contenedores
```
