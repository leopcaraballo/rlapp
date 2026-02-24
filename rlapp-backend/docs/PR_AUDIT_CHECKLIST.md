# Matriz de control de PR por fases

## Proposito

Estandarizar la ejecucion del flujo `feature/backend-ia-native-phase-*` con controles auditable por fase y bloqueo de desvio de gobernanza.

## Flujo oficial

1. `develop`
2. `feature/backend-ia-native-phase-1`
3. `feature/backend-ia-native-phase-2`
4. `feature/backend-ia-native-phase-3`
5. Merge final unico a `develop` con `--no-ff`

## Reglas no negociables

- No trabajar en `main`.
- No hacer commits directos en `develop`.
- Cada fase debe cerrar con pruebas en verde.
- Cada fase debe evidenciar secuencia TDD coherente.
- El merge final a `develop` debe ser unico y controlado.

## Checklist auditable por fase

| Fase | Control | Evidencia requerida | Criterio de aprobacion | Estado |
| --- | --- | --- | --- | --- |
| F0 | Rama correcta desde develop | `git branch --show-current` y `git merge-base --is-ancestor origin/develop HEAD` | Rama `feature/backend-ia-native-phase-N` valida | Pending |
| F1 | Alcance acotado al backend | `git diff --name-only origin/develop...HEAD` | Sin cambios fuera de `rlapp-backend` | Pending |
| F2 | Disciplina TDD por commits | `git log --oneline origin/develop..HEAD` | Hay commits `test:`, `feat:`, `refactor:` en secuencia logica | Pending |
| F3 | Integridad hexagonal | Revision tecnica de capas | Dominio sin dependencias de infraestructura | Pending |
| F4 | Pruebas por fase en verde | `dotnet test RLAPP.slnx --configuration Release` | Sin fallos bloqueantes de fase | Pending |
| F5 | Disciplina de mocks | Revision de tests de aplicacion e integracion | Mocks solo en fronteras | Pending |
| F6 | Cobertura y brechas | Reporte de cobertura y casos negativos | Sin dominancia exclusiva de happy path | Pending |
| F7 | Simulacion de mutaciones | Tabla defecto -> test que falla | Ningun defecto critico sin test detector | Pending |
| F8 | Human check | 1 unit complejo y 1 integration explicados | Razonamiento tecnico trazable | Pending |
| F9 | Merge por fase | PR aprobada y checks obligatorios | Merge de fase sin bypass | Pending |
| F10 | Merge final | PR final a `develop` + historial revisable | Merge unico `--no-ff` y `develop` estable | Pending |

## Hard gates

Si se incumple cualquiera de estos puntos, el PR queda bloqueado:

1. Rama actual es `main` o `develop`.
2. Existen cambios fuera de `rlapp-backend`.
3. No existe evidencia TDD minima (`test`, `feat`, `refactor`).
4. Fallan pruebas unitarias y de aplicacion.
5. Se intenta merge final sin cerrar fases previas.

## Evidencia minima obligatoria en cada PR de fase

- Salida de `./scripts/verify-governance.sh --phase N`.
- Resumen de pruebas ejecutadas.
- Lista de invariantes protegidas.
- Tabla de riesgos abiertos y accion de mitigacion.

## Criterio de cierre de iniciativa

- Todas las fases aprobadas.
- Sin hard gates abiertos.
- Merge final unico y controlado en `develop`.
