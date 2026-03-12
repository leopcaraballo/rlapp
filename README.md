# RLAPP

Este repositorio incluye scripts en la raíz para operar todo el proyecto con enfoque Docker-first.

## Scripts de operación desde raíz

- `./rlapp.sh`: script maestro con todos los comandos.
- `./start.sh`: wrapper para iniciar (`up`).
- `./stop.sh`: wrapper para detener (`down`).
- `./clean.sh`: wrapper para limpiar (`clean`).
- `./restart.sh`: wrapper para reiniciar (`restart`).

## Ejecución por objetivo

Los objetivos soportados son:

- `infra`: `postgres` + `rabbitmq`
- `backend`: `postgres` + `rabbitmq` + `api` + `worker`
- `frontend`: `postgres` + `rabbitmq` + `api` + `worker` + `frontend`
- `all`: stack completo definido en `docker-compose.yml`

## Comandos más usados

Antes de ejecutar Docker Compose por primera vez desde la raíz:

```bash
cp .env.example .env
```

Después, ajuste las credenciales locales de `.env` según su entorno.

Inicio:

- `./start.sh all --build`
- `./start.sh backend`
- `./start.sh frontend`

Detención:

- `./stop.sh all`
- `./stop.sh backend`

Limpieza:

- `./clean.sh all --volumes --prune`

Reinicio (limpiar y ejecutar):

- `./restart.sh all --build`
- `./restart.sh backend`
- `./restart.sh frontend`

Estado y logs:

- `./rlapp.sh status all`
- `./rlapp.sh logs backend -f`

## Objetivo final: ejecución completa en Docker

Para levantar todo el proyecto en Docker desde la raíz:

```bash
cp .env.example .env
./start.sh all --build
```

Para reinicio completo y limpio:

```bash
./clean.sh all --volumes --prune
./start.sh all --build
```
