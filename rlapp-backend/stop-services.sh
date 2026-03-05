#!/usr/bin/env bash
# =============================================================================
# RLAPP Backend — Detencion de servicios
# Uso:
#   ./stop-services.sh              → Detiene procesos .NET locales + infra Docker
#   ./stop-services.sh --docker     → Detiene todo el stack Docker
#   ./stop-services.sh --clean      → Detiene todo y elimina volumenes
#   ./stop-services.sh --purge      → Detiene, elimina volumenes e imagenes RLAPP
# =============================================================================
set -euo pipefail

# --- Rutas ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
REPO_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
PID_FILE="/tmp/rlapp-local-pids"

# --- Colores ---------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Argumentos ------------------------------------------------------------
REMOVE_VOLUMES=false
PURGE_IMAGES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)  REMOVE_VOLUMES=true; shift ;;
    --purge)  REMOVE_VOLUMES=true; PURGE_IMAGES=true; shift ;;
    --docker) shift ;;  # aceptado para compatibilidad, no cambia comportamiento
    -h|--help)
      echo "Uso: $0 [--clean | --purge]"
      echo ""
      echo "Opciones:"
      echo "  --clean   Detiene contenedores y elimina volumenes de datos"
      echo "  --purge   Igual que --clean, ademas elimina imagenes Docker de RLAPP"
      echo "  --docker  Aceptado por compatibilidad (sin efecto adicional)"
      exit 0
      ;;
    *) echo -e "${RED}Argumento desconocido: $1${NC}"; exit 1 ;;
  esac
done

echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  RLAPP — Detencion de servicios${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""

# --- Paso 1: Detener procesos .NET locales ----------------------------------
echo -e "${YELLOW}[1/3] Deteniendo procesos .NET locales...${NC}"

KILLED=0
if [[ -f "$PID_FILE" ]]; then
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      ((KILLED++))
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Tambien buscar procesos dotnet de WaitingRoom por si se escaparon del PID file
PIDS_DOTNET=$(pgrep -f "WaitingRoom\.(API|Worker|Projections)" 2>/dev/null || true)
if [[ -n "$PIDS_DOTNET" ]]; then
  echo "$PIDS_DOTNET" | xargs kill 2>/dev/null || true
  KILLED=$((KILLED + $(echo "$PIDS_DOTNET" | wc -w)))
fi

if [[ $KILLED -gt 0 ]]; then
  echo -e "  ${GREEN}Detenidos $KILLED proceso(s) .NET${NC}"
else
  echo -e "  ${GREEN}No habia procesos .NET locales activos${NC}"
fi

# Limpiar logs temporales
rm -f /tmp/rlapp-api.log /tmp/rlapp-worker.log /tmp/rlapp-projections.log 2>/dev/null || true
echo ""

# --- Paso 2: Detener contenedores Docker -----------------------------------
echo -e "${YELLOW}[2/3] Deteniendo contenedores Docker...${NC}"

if [[ -f "$COMPOSE_FILE" ]]; then
  if $REMOVE_VOLUMES; then
    docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    echo -e "  ${GREEN}Contenedores detenidos y volumenes eliminados${NC}"
  else
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    echo -e "  ${GREEN}Contenedores detenidos (volumenes preservados)${NC}"
  fi
else
  echo -e "  ${YELLOW}No se encontro docker-compose.yml — omitiendo${NC}"
fi
echo ""

# --- Paso 3: Limpiar imagenes (solo con --purge) ----------------------------
if $PURGE_IMAGES; then
  echo -e "${YELLOW}[3/3] Eliminando imagenes Docker de RLAPP...${NC}"
  RLAPP_IMAGES=$(docker images --filter "reference=*rlapp*" -q 2>/dev/null || true)
  if [[ -n "$RLAPP_IMAGES" ]]; then
    echo "$RLAPP_IMAGES" | xargs docker rmi -f 2>/dev/null || true
    echo -e "  ${GREEN}Imagenes RLAPP eliminadas${NC}"
  else
    echo -e "  ${GREEN}No habia imagenes RLAPP para eliminar${NC}"
  fi

  # Limpiar imagenes huerfanas (dangling)
  docker image prune -f >/dev/null 2>&1 || true
  echo -e "  ${GREEN}Imagenes huerfanas limpiadas${NC}"
else
  echo -e "${YELLOW}[3/3] Limpieza de imagenes omitida (usa --purge para incluirla)${NC}"
fi

echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${GREEN}  Servicios detenidos correctamente.${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""
