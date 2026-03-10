# =============================================================================
# Makefile — RLAPP Enterprise Monorepo
# Comandos de desarrollo, pruebas y operaciones
# =============================================================================

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Variables
COMPOSE_FILE := docker-compose.yml
COMPOSE_CI_FILE := docker-compose.ci.yml
BACKEND_DIR := apps/backend
FRONTEND_DIR := apps/frontend

.PHONY: help dev build test lint clean logs ps stop restart \
        backend-test frontend-test infra-up infra-down db-shell

# =============================================================================
# Ayuda
# =============================================================================

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' | sort

# =============================================================================
# Desarrollo local
# =============================================================================

dev: ## Levanta el stack completo en modo desarrollo
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "Stack levantado. Frontend: http://localhost:3001 | API: http://localhost:5000"

dev-build: ## Reconstruye y levanta el stack sin cache
	docker compose -f $(COMPOSE_FILE) build --no-cache
	docker compose -f $(COMPOSE_FILE) up -d

restart: ## Reinicia todos los servicios
	docker compose -f $(COMPOSE_FILE) restart

stop: ## Detiene todos los servicios
	docker compose -f $(COMPOSE_FILE) down

# =============================================================================
# Infraestructura (solo DB + broker)
# =============================================================================

infra-up: ## Levanta solo PostgreSQL y RabbitMQ
	docker compose -f $(COMPOSE_FILE) up -d postgres rabbitmq

infra-down: ## Detiene la infraestructura
	docker compose -f $(COMPOSE_FILE) down postgres rabbitmq

db-shell: ## Abre una sesión psql en PostgreSQL
	docker exec -it rlapp-postgres psql -U rlapp -d rlapp_waitingroom

# =============================================================================
# Pruebas
# =============================================================================

test: backend-test frontend-test ## Ejecuta todos los tests (backend + frontend)

backend-test: ## Ejecuta los tests del backend (.NET)
	cd $(BACKEND_DIR) && dotnet test RLAPP.slnx --configuration Release --verbosity minimal

backend-test-detail: ## Ejecuta tests del backend con detalle completo
	cd $(BACKEND_DIR) && ./run-tests-detail.sh

frontend-test: ## Ejecuta los tests del frontend (Jest)
	cd $(FRONTEND_DIR) && npm ci && npm test -- --runInBand

frontend-test-watch: ## Ejecuta los tests del frontend en modo watch
	cd $(FRONTEND_DIR) && npm test -- --watch

# =============================================================================
# Calidad de código
# =============================================================================

lint: lint-backend lint-frontend ## Ejecuta linters en todo el monorepo

lint-backend: ## Ejecuta análisis estático .NET
	cd $(BACKEND_DIR) && dotnet build RLAPP.slnx --configuration Release /p:TreatWarningsAsErrors=true

lint-frontend: ## Ejecuta ESLint en el frontend
	cd $(FRONTEND_DIR) && npm run lint

# =============================================================================
# Build
# =============================================================================

build: build-backend build-frontend ## Compila todo el monorepo

build-backend: ## Compila el backend .NET
	cd $(BACKEND_DIR) && dotnet build RLAPP.slnx --configuration Release

build-frontend: ## Compila el frontend Next.js
	cd $(FRONTEND_DIR) && npm ci && npm run build

# =============================================================================
# Operaciones
# =============================================================================

logs: ## Muestra logs de todos los servicios
	docker compose -f $(COMPOSE_FILE) logs --tail=100 -f

logs-api: ## Muestra logs del API
	docker compose -f $(COMPOSE_FILE) logs --tail=100 -f api

logs-worker: ## Muestra logs del Worker
	docker compose -f $(COMPOSE_FILE) logs --tail=100 -f worker

logs-frontend: ## Muestra logs del Frontend
	docker compose -f $(COMPOSE_FILE) logs --tail=100 -f frontend

ps: ## Muestra el estado de los contenedores
	docker compose -f $(COMPOSE_FILE) ps

# =============================================================================
# Limpieza
# =============================================================================

clean: ## Limpia artefactos generados y contenedores detenidos
	docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans
	docker system prune -f
	find apps/backend -name "bin" -type d -exec rm -rf {} + 2>/dev/null || true
	find apps/backend -name "obj" -type d -exec rm -rf {} + 2>/dev/null || true
	rm -rf apps/frontend/.next apps/frontend/node_modules 2>/dev/null || true
	@echo "Limpieza completada"

clean-docker: ## Limpia solo recursos Docker (contenedores, redes, imágenes colgantes)
	docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans
	docker system prune -f

# =============================================================================
# CI
# =============================================================================

ci-test: ## Ejecuta las pruebas en modo CI (con overlay de CI)
	docker compose -f $(COMPOSE_FILE) -f $(COMPOSE_CI_FILE) up -d postgres rabbitmq
	sleep 10
	cd $(BACKEND_DIR) && dotnet test RLAPP.slnx --configuration Release --verbosity minimal
	cd $(FRONTEND_DIR) && npm ci && npm test -- --runInBand --forceExit
	docker compose -f $(COMPOSE_FILE) -f $(COMPOSE_CI_FILE) down
