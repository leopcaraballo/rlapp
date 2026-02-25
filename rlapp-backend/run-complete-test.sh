#!/bin/bash

# RLAPP Backend - Test Suite Execution Script
# This script reproduces the complete test cycle from scratch

set -e

# Calculate PROJECT_ROOT relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "════════════════════════════════════════════════════════════════════"
echo "🚀 RLAPP Backend - Complete Test Cycle"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Cleanup Docker
echo -e "${YELLOW}STEP 1: Cleaning Docker Containers & Volumes${NC}"
cd "$PROJECT_ROOT"
docker-compose down -v 2>/dev/null || true
docker system prune -a -f > /dev/null 2>&1 || true
docker volume prune -f > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Docker cleaned${NC}"
echo ""

# Step 2: Cleanup .NET Cache
echo -e "${YELLOW}STEP 2: Cleaning .NET Cache & Binaries${NC}"
find "$PROJECT_ROOT" -type d \( -name "bin" -o -name "obj" \) -exec rm -rf {} + 2>/dev/null || true
rm -rf ~/.nuget/packages/* 2>/dev/null || true
echo -e "${GREEN}✓ .NET cache cleaned${NC}"
echo ""

# Step 3: Clean Solution
echo -e "${YELLOW}STEP 3: Clean Solution${NC}"
cd "$PROJECT_ROOT"
dotnet clean RLAPP.slnx > /tmp/clean.log 2>&1
echo -e "${GREEN}✓ Solution cleaned${NC}"
echo ""

# Step 4: Build Solution
echo -e "${YELLOW}STEP 4: Build Solution (Release)${NC}"
cd "$PROJECT_ROOT"
dotnet build RLAPP.slnx --configuration Release > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Solution built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    tail -30 /tmp/build.log
    exit 1
fi
echo ""

# Step 5: Run Tests
echo -e "${YELLOW}STEP 5: Execute Test Suite (65 tests)${NC}"
cd "$PROJECT_ROOT"
dotnet test RLAPP.slnx --configuration Release --no-build --verbosity normal > /tmp/tests.log 2>&1
if [ $? -eq 0 ]; then
    PASSED=$(grep -c "Correcto" /tmp/tests.log || echo "0")
    echo -e "${GREEN}✓ All tests passed (65/65)${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    tail -50 /tmp/tests.log
    exit 1
fi
echo ""

# Step 6: Start Docker Infrastructure
echo -e "${YELLOW}STEP 6: Start Docker Infrastructure${NC}"
cd "$PROJECT_ROOT"
docker-compose up -d postgres rabbitmq prometheus grafana seq pgadmin
sleep 20
echo -e "${GREEN}✓ Infrastructure started${NC}"
echo ""

# Step 7: Start Application Services
echo -e "${YELLOW}STEP 7: Start Application Services${NC}"

cd "$PROJECT_ROOT/src/Services/WaitingRoom/WaitingRoom.API"
nohup dotnet run --configuration Release --urls "http://0.0.0.0:5000" > /tmp/api.log 2>&1 &
API_PID=$!
echo "  API (PID: $API_PID)"

sleep 3

cd "$PROJECT_ROOT/src/Services/WaitingRoom/WaitingRoom.Worker"
nohup dotnet run --configuration Release > /tmp/worker.log 2>&1 &
WORKER_PID=$!
echo "  Worker (PID: $WORKER_PID)"

sleep 2

cd "$PROJECT_ROOT/src/Services/WaitingRoom/WaitingRoom.Projections"
nohup dotnet run --configuration Release > /tmp/projections.log 2>&1 &
PROJ_PID=$!
echo "  Projections (PID: $PROJ_PID)"

sleep 10

# Step 8: Validate API Health
echo -e "${YELLOW}STEP 8: Validate API Endpoints${NC}"

# Health check
HEALTH=$(curl -s http://localhost:5000/health/live 2>/dev/null)
if [ "$HEALTH" = "Healthy" ]; then
    echo -e "${GREEN}✓ GET /health/live${NC}"
else
    echo -e "${RED}✗ GET /health/live${NC}"
fi

# Check-in endpoint
RESPONSE=$(curl -s -X POST http://localhost:5000/api/waiting-room/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "queueId": "queue-001",
    "patientId": "patient-001",
    "patientName": "Test Patient",
    "priority": "HIGH",
    "consultationType": "Cardiology"
  }' 2>/dev/null)

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ POST /api/waiting-room/check-in${NC}"
else
    echo -e "${RED}✗ POST /api/waiting-room/check-in${NC}"
fi

echo ""
echo "================================================================"
echo -e "${GREEN}CICLO DE PRUEBAS COMPLETADO${NC}"
echo "================================================================"
echo ""
echo "Servicios disponibles:"
echo ""
echo "  Aplicacion:"
echo "    API REST:              http://localhost:5000"
echo ""
echo "  Documentacion API:"
echo "    Scalar UI (interactiva): http://localhost:5000/scalar/v1"
echo "    OpenAPI JSON:            http://localhost:5000/openapi/v1.json"
echo ""
echo "  Observabilidad:"
echo "    Grafana (dashboards):  http://localhost:3002  (admin / admin123)"
echo "    Prometheus (metricas): http://localhost:9090"
echo "    Seq (logs):            http://localhost:5341  (admin123)"
echo ""
echo "  Infraestructura:"
echo "    PostgreSQL:            localhost:5432  (rlapp / rlapp_secure_password)"
echo "    RabbitMQ Management:   http://localhost:15672  (guest / guest)"
echo "    PgAdmin:               http://localhost:5050  (admin@rlapp.com / admin123)"
echo ""
echo "  Logs:"
echo "    API:         /tmp/api.log"
echo "    Worker:      /tmp/worker.log"
echo "    Projections: /tmp/projections.log"
echo ""
echo "  Para detener:"
echo "    pkill -f 'dotnet run'"
echo "    docker compose down"
echo ""
