#!/usr/bin/env bash
set -euo pipefail

# orchestrator-init.sh
# Copia los archivos del orquestador desde el repositorio de origen
# al directorio de destino (por defecto: cwd). Diseñado para instalar
# el blueprint de orquestación en cualquier proyecto.

usage() {
  cat <<EOF
Usage: $(basename "$0") [-s SOURCE_DIR] [-t TARGET_DIR] [--force] [--run-sync]

Options:
  -s SOURCE_DIR   Ruta al repositorio que contiene el blueprint (por defecto: script dir)
  -t TARGET_DIR   Ruta del proyecto destino (por defecto: current working dir)
  --force         Sobrescribir archivos existentes sin preguntar
  --run-sync      Ejecutar scripts/sync.sh en el destino después de copiar
  -h              Mostrar esta ayuda
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/.."
TARGET_DIR="$(pwd)"
FORCE=0
RUN_SYNC=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s) SOURCE_DIR="$2"; shift 2 ;;
    -t) TARGET_DIR="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --run-sync) RUN_SYNC=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

echo "Orchestrator init: source=${SOURCE_DIR}, target=${TARGET_DIR}"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: SOURCE_DIR not found: $SOURCE_DIR" >&2
  exit 2
fi

COPY_ITEMS=(
  "docs/agent-context"
  "docs/ORCHESTRATION_BLUEPRINT.md"
  "skills"
  "scripts/sync.sh"
  "AI_WORKFLOW.md"
  "DEBT_REPORT.md"
  ".github/copilot-instructions.md"
  "GEMINI.md"
)

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

for item in "${COPY_ITEMS[@]}"; do
  src="$SOURCE_DIR/$item"
  if [ -e "$src" ]; then
    dest="$TARGET_DIR/$(basename "$item")"
    if [ -e "$dest" ] && [ "$FORCE" -ne 1 ]; then
      echo "Aviso: $dest ya existe. Use --force para sobrescribir." >&2
      continue
    fi
    echo "Copiando $src -> $TARGET_DIR/"
    mkdir -p "$(dirname "$dest")"
    if [ -d "$src" ]; then
      rm -rf "$dest" || true
      cp -a "$src" "$dest"
    else
      cp -f "$src" "$TARGET_DIR/"
    fi
  fi
done

# Crear una tarea sugerida de VS Code en .vscode/tasks.json para inicializar el orquestador
mkdir -p .vscode
TASKS_FILE=.vscode/tasks.json
if [ -e "$TASKS_FILE" ] && [ "$FORCE" -ne 1 ]; then
  echo "Info: $TASKS_FILE ya existe. No lo sobrescribo (usar --force para forzar)."
else
  cat > "$TASKS_FILE" <<'JSON'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Inicializar Orquestador",
      "type": "shell",
      "command": "./scripts/orchestrator-init.sh --run-sync",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "problemMatcher": []
    }
  ]
}
JSON
  echo "Tarea VS Code creada en $TASKS_FILE"
fi

if [ "$RUN_SYNC" -eq 1 ]; then
  if [ -x "scripts/sync.sh" ]; then
    echo "Ejecutando scripts/sync.sh en destino..."
    (cd "$TARGET_DIR" && bash scripts/sync.sh)
  else
    echo "Warning: scripts/sync.sh no es ejecutable o no existe en destino. Ejecuta 'bash scripts/sync.sh' manualmente."
  fi
fi

echo "Instalación del orquestador completada en $TARGET_DIR"
