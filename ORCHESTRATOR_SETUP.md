# Integración del Orquestador con el IDE (VS Code) y uso global

Este documento explica cómo usar el script `scripts/orchestrator-init.sh` para instalar
el blueprint del Orquestador en cualquier proyecto y cómo integrarlo en VS Code
para facilitar su uso desde cualquier carpeta de trabajo.

Resumen de la solución

- `scripts/orchestrator-init.sh`: copia los archivos esenciales del orquestador
  (carpeta `docs/agent-context`, `skills/`, `scripts/sync.sh`, `AI_WORKFLOW.md`, etc.)
  desde el repositorio origen hacia el proyecto destino.
- El script crea una tarea sugerida en `.vscode/tasks.json` del proyecto destino.

Instalación rápida (global)

1. Hacer ejecutable el script desde el repositorio origen:

```bash
cd /ruta/a/IA_P1_Fork
chmod +x scripts/orchestrator-init.sh
```

2. Instalar el script en el `PATH` del usuario (opcional pero recomendado):

```bash
sudo ln -s /ruta/a/IA_P1_Fork/scripts/orchestrator-init.sh /usr/local/bin/orchestrator-init
# o copiar el script a ~/bin y asegurarse que ~/bin esté en $PATH
```

Uso desde cualquier proyecto

1. Sitúate en la carpeta raíz del proyecto donde quieras instalar el orquestador.
2. Ejecuta:

```bash
orchestrator-init -s /ruta/a/IA_P1_Fork --run-sync
```

Opciones útiles

- `-s`: ruta al repositorio origen que contiene el blueprint (si no se instala en PATH).
- `-t`: ruta al proyecto destino (por defecto: `.`).
- `--force`: sobrescribe archivos existentes sin preguntar.
- `--run-sync`: ejecuta `scripts/sync.sh` después de copiar.

Integración con VS Code (recomendado)

- El script crea una tarea en `.vscode/tasks.json` del proyecto:
  - **Label:** "Inicializar Orquestador"
  - **Command:** `./scripts/orchestrator-init.sh --run-sync`

- Para ejecutar la tarea desde VS Code:
  - Abre la paleta (Ctrl+Shift+P) → "Tasks: Run Task" → selecciona "Inicializar Orquestador".

Agregar un comando rápido en la configuración de usuario (opcional)

Si deseas ejecutar la inicialización directamente desde VS Code sin agregar el script al PATH,
puedes añadir una _tarea de usuario_ en la configuración global de VS Code (User Tasks).
Ejemplo de snippet para `settings.json` o user tasks (requiere extensión que soporte tareas globales):

```json
// Ejemplo conceptual; VS Code no expone tareas globales sin extensión.
// Mejor alternativa: instalar script en PATH y usar la paleta de comandos para ejecutar.
```

Buenas prácticas y seguridad

- Revisa siempre los cambios que el script propone (especialmente en `DEBT_REPORT.md` y `AI_WORKFLOW.md`).
- No instales el script en PATH si no confías en su origen.
- Usa `--force` solo cuando estés seguro de sobrescribir archivos.

¿Qué hace falta para automatizar totalmente al abrir un proyecto?

- Para que el orquestador se active automáticamente al abrir cualquier proyecto en VS Code, sería
  necesaria una extensión de VS Code que:
  1. Detecte la apertura de una carpeta
  2. Pregunte al usuario si quiere inicializar el orquestador
  3. Ejecute `orchestrator-init` (con guardrails)

Crear dicha extensión es posible (TypeScript), pero excede el alcance de este script. Si quieres,
puedo generar el esqueleto de una extensión de VS Code que añada ese comportamiento.
