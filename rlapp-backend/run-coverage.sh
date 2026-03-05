#!/usr/bin/env bash
# =============================================================================
# RLAPP — Script de reporte de cobertura de codigo
# =============================================================================
# Genera reportes de cobertura HTML y verifica umbrales minimos.
#
# Uso:
#   ./run-coverage.sh              # Ejecutar tests con cobertura
#   ./run-coverage.sh --report     # Generar reporte HTML
#   ./run-coverage.sh --check 80   # Verificar umbral minimo (%)
#
# HUMAN CHECK: Instalar reportgenerator para reportes HTML:
#   dotnet tool install -g dotnet-reportgenerator-globaltool
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/TestResults"
COVERAGE_DIR="${SCRIPT_DIR}/CoverageReport"
RUNSETTINGS="${SCRIPT_DIR}/coverage.runsettings"
THRESHOLD="${3:-80}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Limpiar resultados anteriores
cleanup() {
    log_info "Limpiando resultados anteriores..."
    rm -rf "${RESULTS_DIR}" "${COVERAGE_DIR}"
    mkdir -p "${RESULTS_DIR}"
}

# Ejecutar tests con cobertura
run_tests_with_coverage() {
    log_info "Ejecutando tests con cobertura de codigo..."

    dotnet test "${SCRIPT_DIR}/RLAPP.slnx" \
        --configuration Release \
        --settings "${RUNSETTINGS}" \
        --collect:"XPlat Code Coverage" \
        --results-directory "${RESULTS_DIR}" \
        --verbosity minimal \
        --logger "trx;LogFileName=test-results.trx"

    log_info "Tests completados. Resultados en: ${RESULTS_DIR}"
}

# Generar reporte HTML
generate_report() {
    if ! command -v reportgenerator &> /dev/null; then
        log_warn "reportgenerator no esta instalado. Instalando..."
        dotnet tool install -g dotnet-reportgenerator-globaltool || true
        export PATH="$PATH:$HOME/.dotnet/tools"
    fi

    log_info "Generando reporte HTML de cobertura..."

    reportgenerator \
        -reports:"${RESULTS_DIR}/**/coverage.cobertura.xml" \
        -targetdir:"${COVERAGE_DIR}" \
        -reporttypes:"Html;Badges;TextSummary;Cobertura" \
        -assemblyfilters:"+WaitingRoom.*;-*.Tests.*" \
        -classfilters:"-*Program;-*Migrations*"

    log_info "Reporte generado en: ${COVERAGE_DIR}/index.html"

    # Mostrar resumen en consola
    if [ -f "${COVERAGE_DIR}/Summary.txt" ]; then
        echo ""
        echo "=== Resumen de Cobertura ==="
        cat "${COVERAGE_DIR}/Summary.txt"
        echo ""
    fi
}

# Verificar umbral minimo
check_threshold() {
    local threshold="${1:-80}"

    log_info "Verificando umbral minimo de cobertura: ${threshold}%..."

    # Buscar archivos de cobertura
    local coverage_files
    coverage_files=$(find "${RESULTS_DIR}" -name "coverage.cobertura.xml" 2>/dev/null)

    if [ -z "${coverage_files}" ]; then
        log_error "No se encontraron archivos de cobertura. Ejecute primero: ./run-coverage.sh"
        exit 1
    fi

    # Extraer porcentaje de cobertura de lineas del primer archivo
    local line_rate
    line_rate=$(grep -oP 'line-rate="\K[0-9.]+' <<< "$(head -5 "$(echo "${coverage_files}" | head -1)")" || echo "0")
    local coverage_pct
    coverage_pct=$(echo "${line_rate} * 100" | bc -l 2>/dev/null | cut -d. -f1 || echo "0")

    echo "Cobertura de lineas: ${coverage_pct}%"
    echo "Umbral requerido:    ${threshold}%"

    if [ "${coverage_pct}" -lt "${threshold}" ]; then
        log_error "La cobertura (${coverage_pct}%) esta por debajo del umbral (${threshold}%)."
        exit 1
    else
        log_info "La cobertura (${coverage_pct}%) cumple el umbral (${threshold}%)."
    fi
}

# Main
case "${1:-}" in
    --report)
        generate_report
        ;;
    --check)
        check_threshold "${2:-80}"
        ;;
    --full)
        cleanup
        run_tests_with_coverage
        generate_report
        check_threshold "${2:-80}"
        ;;
    *)
        cleanup
        run_tests_with_coverage
        ;;
esac
