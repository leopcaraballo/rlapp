# RLAPP

> Guía mínima para ejecutar el sistema completo únicamente con Docker.

---

## 1. Ejecución principal

1. Copie la plantilla de entorno:

```bash
cp .env.example .env
```

1. Levante el sistema:

```bash
docker compose up --build
```

Con este comando se inicia el stack funcional base:

- `postgres`
- `rabbitmq`
- `api`
- `worker`
- `frontend`

URLs operativas esperadas:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:5000`
- Health live: `http://localhost:5000/health/live`
- Health ready: `http://localhost:5000/health/ready`

## 2. Servicios opcionales

Los servicios de observabilidad y administración quedan fuera del arranque base y se activan con el perfil `ops`.

```bash
docker compose --profile ops up --build
```

Servicios adicionales del perfil `ops`:

- `prometheus`
- `grafana`
- `seq`
- `pgadmin`
- `postgres_exporter`

## 3. Comandos útiles

Detener el sistema:

```bash
docker compose down
```

Detener y eliminar volúmenes:

```bash
docker compose down --volumes
```

Reconstrucción limpia:

```bash
docker compose down --volumes --remove-orphans
docker compose up --build
```

## 4. Scripts auxiliares

El repositorio conserva scripts de soporte en [scripts/dev](scripts/dev) para flujos locales complementarios, pero el comando oficial y soportado para el arranque integral es:

```bash
docker compose up --build
```
