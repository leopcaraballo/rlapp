#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: No se encontró docker-compose.yml en la raíz del repositorio."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está instalado o no está disponible en PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: El daemon de Docker no está en ejecución."
  exit 1
fi

usage() {
  cat <<'EOF'
Uso:
  ./rlapp.sh <comando> [objetivo] [opciones]

Comandos:
  up       Inicia servicios Docker
  down     Detiene servicios Docker
  clean    Limpia contenedores/proyecto Docker
  restart  Reinicia servicios (down + up)
  status   Muestra estado de servicios
  logs     Muestra logs

Objetivos (opcionales, por defecto: all):
  backend   postgres + rabbitmq + api + worker
  frontend  postgres + rabbitmq + api + worker + frontend
  infra     postgres + rabbitmq
  all       stack completo definido en docker-compose.yml

Opciones:
  --build        Forzar build al iniciar
  --no-build     Omitir build al iniciar
  --volumes      Eliminar volúmenes al bajar/limpiar
  --prune        Ejecutar limpieza de recursos Docker no usados
  -f, --follow   Seguir logs en tiempo real (solo para logs)
  -h, --help     Mostrar ayuda

Ejemplos:
  ./rlapp.sh up all --build
  ./rlapp.sh up backend
  ./rlapp.sh up frontend
  ./rlapp.sh down backend
  ./rlapp.sh clean all --volumes --prune
  ./rlapp.sh restart frontend --build
  ./rlapp.sh logs backend -f
EOF
}

command="${1:-}"
if [[ -z "$command" || "$command" == "-h" || "$command" == "--help" ]]; then
  usage
  exit 0
fi
shift || true

target="all"
if [[ "${1:-}" =~ ^(backend|frontend|infra|all)$ ]]; then
  target="$1"
  shift
fi

build_mode="default"
remove_volumes=false
prune_resources=false
follow_logs=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) build_mode="build"; shift ;;
    --no-build) build_mode="no-build"; shift ;;
    --volumes) remove_volumes=true; shift ;;
    --prune) prune_resources=true; shift ;;
    -f|--follow) follow_logs=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "ERROR: Opción no reconocida: $1"
      usage
      exit 1
      ;;
  esac
done

resolve_services() {
  case "$1" in
    infra)
      echo "postgres rabbitmq"
      ;;
    backend)
      echo "postgres rabbitmq api worker"
      ;;
    frontend)
      echo "postgres rabbitmq api worker frontend"
      ;;
    all)
      echo ""
      ;;
    *)
      echo "ERROR: Objetivo no soportado: $1"
      exit 1
      ;;
  esac
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

up() {
  local services
  services="$(resolve_services "$target")"

  if [[ -z "$services" ]]; then
    if [[ "$build_mode" == "build" ]]; then
      compose up -d --build
    elif [[ "$build_mode" == "no-build" ]]; then
      compose up -d
    else
      compose up -d
    fi
  else
    if [[ "$build_mode" == "build" ]]; then
      compose up -d --build $services
    elif [[ "$build_mode" == "no-build" ]]; then
      compose up -d $services
    else
      compose up -d $services
    fi
  fi
}

down_target() {
  local services
  services="$(resolve_services "$target")"

  if [[ "$target" == "all" ]]; then
    if $remove_volumes; then
      compose down -v --remove-orphans
    else
      compose down --remove-orphans
    fi
  else
    if [[ -n "$services" ]]; then
      compose stop $services || true
      compose rm -f $services || true
    fi
  fi
}

clean() {
  down_target

  if $prune_resources; then
    docker image prune -f >/dev/null 2>&1 || true
    docker container prune -f >/dev/null 2>&1 || true
    docker network prune -f >/dev/null 2>&1 || true
    docker volume prune -f >/dev/null 2>&1 || true
  fi
}

status() {
  local services
  services="$(resolve_services "$target")"
  if [[ -z "$services" ]]; then
    compose ps
  else
    compose ps $services
  fi
}

logs() {
  local services
  services="$(resolve_services "$target")"
  if $follow_logs; then
    if [[ -z "$services" ]]; then
      compose logs -f
    else
      compose logs -f $services
    fi
  else
    if [[ -z "$services" ]]; then
      compose logs --tail=120
    else
      compose logs --tail=120 $services
    fi
  fi
}

case "$command" in
  up)
    up
    ;;
  down)
    down_target
    ;;
  clean)
    clean
    ;;
  restart)
    down_target
    up
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  *)
    echo "ERROR: Comando no soportado: $command"
    usage
    exit 1
    ;;
esac

echo "OK: comando '$command' ejecutado sobre objetivo '$target'."
