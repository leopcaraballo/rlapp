#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Smoke test: conectividad Frontend ↔ Backend
# Verifica que el stack está corriendo y los servicios se comunican.
# Requiere: stack Docker activo (scripts/dev/start.sh)
# Uso: scripts/test/smoke-test.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/docker-check.sh
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/docker-check.sh"
docker_require_full_stack

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  RLAPP — Smoke Test: Conectividad Frontend ↔ Backend${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Frontend responde
echo -e "${YELLOW}[TEST 1/5]${NC} Frontend en http://localhost:3001..."
if curl -s http://localhost:3001/ >/dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC} Frontend responde"
else
  echo -e "${RED}✗ FAIL${NC} Frontend no responde"
  exit 1
fi

# Test 2: Backend responde
echo -e "${YELLOW}[TEST 2/5]${NC} Backend en http://localhost:5000/health/live..."
if curl -s http://localhost:5000/health/live | grep -q "Healthy"; then
  echo -e "${GREEN}✓ PASS${NC} Backend responde: Healthy"
else
  echo -e "${RED}✗ FAIL${NC} Backend no responde correctamente"
  exit 1
fi

# Test 3: Backend desde contenedor frontend
echo -e "${YELLOW}[TEST 3/5]${NC} Conectividad interna (frontend → api:8080)..."
if docker exec rlapp-frontend wget -q -O - http://api:8080/health/live 2>/dev/null | grep -q "Healthy"; then
  echo -e "${GREEN}✓ PASS${NC} Frontend puede alcanzar backend internamente"
else
  echo -e "${RED}✗ FAIL${NC} Frontend no puede conectar al backend"
  exit 1
fi

# Test 4: Variables de entorno frontend
echo -e "${YELLOW}[TEST 4/5]${NC} Verificando variables de entorno del frontend..."
ENV_CHECK=$(docker exec rlapp-frontend grep "NEXT_PUBLIC_API_BASE_URL=http://api:8080" /app/.env.local 2>/dev/null || echo "NOT_FOUND")
if [ "$ENV_CHECK" != "NOT_FOUND" ]; then
  echo -e "${GREEN}✓ PASS${NC} Variables de entorno configuradas correctamente"
else
  echo -e "${YELLOW}⚠ WARN${NC} No se pudo verificar .env.local, pero el frontend está respondiendo"
fi

# Test 5: CSP headers
echo -e "${YELLOW}[TEST 5/5]${NC} Verificando CSP headers..."
CSP=$(curl -s -I http://localhost:3001/ 2>/dev/null | grep -i "Content-Security-Policy" || echo "NOT_FOUND")
if [ "$CSP" != "NOT_FOUND" ]; then
  echo -e "${GREEN}✓ PASS${NC} CSP headers configurado"
  if echo "$CSP" | grep -q "http://api:8080"; then
    echo -e "${GREEN}✓ PASS${NC} CSP permite conexión a http://api:8080"
  else
    echo -e "${YELLOW}⚠ WARN${NC} CSP no incluye http://api:8080 explícitamente (pero sí puede funcionar con 'self')"
  fi
else
  echo -e "${YELLOW}⚠ WARN${NC} CSP header no encontrado (podría ser OK en desarrollo)"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Todos los tests básicos pasaron${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Siguientes pasos:${NC}"
echo "1. Abre http://localhost:3001 en tu navegador"
echo "2. Abre la consola (F12)"
echo "3. Intenta navegar e interactuar con la aplicación"
echo "4. Verifica que no haya errores de red en la consola"
echo "5. Revisa INTEGRATION_CHECKLIST.md para más detalles"
echo ""

