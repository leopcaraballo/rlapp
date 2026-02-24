#!/usr/bin/env bash

set -euo pipefail

PHASE=""
RUN_TESTS="true"
SKIP_TDD="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase)
      PHASE="${2:-}"
      shift 2
      ;;
    --no-tests)
      RUN_TESTS="false"
      shift
      ;;
    --skip-tdd)
      SKIP_TDD="true"
      shift
      ;;
    *)
      echo "Parametro no reconocido: $1"
      exit 2
      ;;
  esac
done

if [[ -z "$PHASE" ]]; then
  echo "Uso: ./scripts/verify-governance.sh --phase <1|2|3|final> [--no-tests]"
  exit 2
fi

CURRENT_BRANCH="$(git branch --show-current)"

echo "[INFO] Branch actual: $CURRENT_BRANCH"
echo "[INFO] Fase declarada: $PHASE"

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "develop" ]]; then
  echo "[BLOCKER] No se permite trabajar en main o develop."
  exit 1
fi

if [[ ! "$CURRENT_BRANCH" =~ ^feature/backend-ia-native-phase-(1|2|3)$ ]]; then
  if [[ "$PHASE" != "final" ]]; then
    echo "[BLOCKER] La rama no cumple el patron feature/backend-ia-native-phase-(1|2|3)."
    exit 1
  fi
fi

if ! git merge-base --is-ancestor origin/develop HEAD; then
  echo "[BLOCKER] La rama no contiene origin/develop como ancestro."
  exit 1
fi

CHANGED_FILES="$(git diff --name-only origin/develop...HEAD || true)"
if [[ -n "$CHANGED_FILES" ]]; then
  if echo "$CHANGED_FILES" | grep -q '^\.\./'; then
    echo "[BLOCKER] Se detectaron rutas fuera de la raiz del repositorio:"
    echo "$CHANGED_FILES" | grep '^\.\./'
    exit 1
  fi
fi

COMMITS_RANGE="origin/develop..HEAD"
COMMITS="$(git log --pretty=format:'%s' $COMMITS_RANGE || true)"

if [[ "$SKIP_TDD" == "true" ]]; then
  echo "[WARN] Validacion TDD omitida por bandera --skip-tdd (solo inicializacion controlada)."
else
  if [[ -z "$COMMITS" ]]; then
    echo "[WARN] No hay commits en la rama respecto a origin/develop."
  else
    if ! echo "$COMMITS" | grep -q '^test:'; then
      echo "[BLOCKER] No se detecta commit tipo test:"
      exit 1
    fi
    if ! echo "$COMMITS" | grep -q '^feat:'; then
      echo "[BLOCKER] No se detecta commit tipo feat:"
      exit 1
    fi
    if ! echo "$COMMITS" | grep -q '^refactor:'; then
      echo "[BLOCKER] No se detecta commit tipo refactor:"
      exit 1
    fi
  fi
fi

if [[ "$RUN_TESTS" == "true" ]]; then
  echo "[INFO] Ejecutando pruebas unitarias y de aplicacion"
  dotnet test RLAPP.slnx --configuration Release --filter "FullyQualifiedName~WaitingRoom.Tests.Domain|FullyQualifiedName~WaitingRoom.Tests.Application" --nologo
fi

echo "[OK] Validacion de gobernanza completada."
