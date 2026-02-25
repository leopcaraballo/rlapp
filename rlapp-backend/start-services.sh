#!/bin/bash
set -e

# ==============================================================================
# RLAPP Backend — Inicio de servicios locales (sin Docker)
# Requiere: PostgreSQL y RabbitMQ corriendo localmente o en Docker
# Uso: ./start-services.sh
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
SRCS="$PROJECT_ROOT/src/Services/WaitingRoom"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  RLAPP Backend — Inicio de servicios locales${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Iniciar API
echo -e "${YELLOW}[1/3] Iniciando WaitingRoom.API...${NC}"
cd "$SRCS/WaitingRoom.API"
nohup dotnet run --configuration Release --urls "http://0.0.0.0:5000" > /tmp/api.nohup.log 2>&1 &
API_PID=$!
echo "      PID: $API_PID"
sleep 4

# Iniciar Worker (Outbox Dispatcher)
echo -e "${YELLOW}[2/3] Iniciando WaitingRoom.Worker (Outbox)...${NC}"
cd "$SRCS/WaitingRoom.Worker"
nohup dotnet run --configuration Release > /tmp/worker.nohup.log 2>&1 &
WORKER_PID=$!
echo "      PID: $WORKER_PID"
sleep 3

# Iniciar Projections
echo -e "${YELLOW}[3/3] Iniciando WaitingRoom.Projections...${NC}"
cd "$SRCS/WaitingRoom.Projections"
nohup dotnet run --configuration Release > /tmp/projections.nohup.log 2>&1 &
PROJ_PID=$!
echo "      PID: $PROJ_PID"

echo ""
echo -e "${YELLOW}Esperando que la API este lista...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:5000/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}API lista en http://localhost:5000${NC}"
    break
  fi
  echo "      Intento $i/30..."
  sleep 2
done

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  Servicios backend iniciados${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${CYAN}Logs:${NC}"
echo "  API:         /tmp/api.nohup.log"
echo "  Worker:      /tmp/worker.nohup.log"
echo "  Projections: /tmp/projections.nohup.log"
echo ""
echo -e "${CYAN}Documentacion API:${NC}"
echo "  Scalar UI (interactiva): http://localhost:5000/scalar/v1"
echo "  OpenAPI JSON:            http://localhost:5000/openapi/v1.json"
echo ""
echo -e "${CYAN}Health Checks:${NC}"
echo "  Liveness:  http://localhost:5000/health/live"
echo "  Readiness: http://localhost:5000/health/ready"
echo ""
echo -e "${CYAN}Endpoints API (Comandos):${NC}"
echo "  POST /api/waiting-room/check-in"
echo "  POST /api/reception/register"
echo "  POST /api/cashier/call-next"
echo "  POST /api/cashier/validate-payment"
echo "  POST /api/cashier/mark-payment-pending"
echo "  POST /api/cashier/mark-absent"
echo "  POST /api/cashier/cancel-payment"
echo "  POST /api/medical/call-next"
echo "  POST /api/medical/consulting-room/activate"
echo "  POST /api/medical/consulting-room/deactivate"
echo "  POST /api/medical/start-consultation"
echo "  POST /api/medical/finish-consultation"
echo "  POST /api/medical/mark-absent"
echo "  POST /api/waiting-room/claim-next"
echo "  POST /api/waiting-room/call-patient"
echo "  POST /api/waiting-room/complete-attention"
echo ""
echo -e "${CYAN}Endpoints API (Consultas):${NC}"
echo "  GET  /api/v1/waiting-room/{queueId}/monitor"
echo "  GET  /api/v1/waiting-room/{queueId}/queue-state"
echo "  GET  /api/v1/waiting-room/{queueId}/next-turn"
echo "  GET  /api/v1/waiting-room/{queueId}/recent-history"
echo "  POST /api/v1/waiting-room/{queueId}/rebuild"
echo ""
echo "Para detener: pkill -f 'dotnet run'"
echo ""
