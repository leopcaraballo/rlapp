#!/usr/bin/env bash
# =============================================================================
# RLAPP — Biblioteca compartida: validación de Docker
#
# USO (source desde otros scripts):
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../lib/docker-check.sh"
#
# Funciones disponibles:
#   docker_check              → Verifica que Docker esté instalado y activo
#   docker_require_api [url]  → Verifica que la API responda (por defecto :5000)
#   docker_require_service <nombre> → Verifica que un contenedor esté corriendo
#   docker_require_full_stack → Verifica API + Frontend corriendo
# =============================================================================

_RED='\033[0;31m'
_YELLOW='\033[1;33m'
_NC='\033[0m'

# Verifica que Docker esté instalado y el daemon activo.
docker_check() {
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${_RED}ERROR: Docker no está instalado o no está disponible en PATH.${_NC}"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo -e "${_RED}ERROR: El daemon de Docker no está en ejecución.${_NC}"
    echo -e "  Ejecuta: ${_YELLOW}sudo systemctl start docker${_NC}"
    exit 1
  fi
}

# Verifica que un contenedor específico esté corriendo.
# Uso: docker_require_service rlapp-postgres
docker_require_service() {
  local service="$1"
  docker_check
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${service}$"; then
    echo -e "${_RED}ERROR: El contenedor '${service}' no está corriendo.${_NC}"
    echo -e "  Inicia el stack con: ${_YELLOW}scripts/dev/start.sh${_NC}"
    exit 1
  fi
}

# Verifica que la API HTTP responda.
# Uso: docker_require_api [http://localhost:5000]
docker_require_api() {
  local api="${1:-http://localhost:5000}"
  docker_check
  local ok=false
  for path in /health/live /health/ready /health ""; do
    if curl -sf --max-time 5 "${api}${path}" >/dev/null 2>&1; then
      ok=true
      break
    fi
  done
  if ! $ok; then
    echo -e "${_RED}ERROR: La API no responde en ${api}${_NC}"
    echo -e "  Inicia el stack con: ${_YELLOW}scripts/dev/start.sh${_NC}"
    exit 1
  fi
}

# Verifica que estén corriendo tanto la API como el frontend.
docker_require_full_stack() {
  docker_require_api "${1:-http://localhost:5000}"
  local frontend="${2:-http://localhost:3001}"
  if ! curl -sf --max-time 5 "$frontend" >/dev/null 2>&1; then
    echo -e "${_RED}ERROR: El frontend no responde en ${frontend}${_NC}"
    echo -e "  Inicia el stack con: ${_YELLOW}scripts/dev/start.sh${_NC}"
    exit 1
  fi
}
