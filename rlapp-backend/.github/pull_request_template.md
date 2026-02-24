# Control de PR por fase backend

## Identificacion

- Fase: [ ] 1 [ ] 2 [ ] 3 [ ] Final a develop
- Rama origen:
- Rama destino:
- Ticket o iniciativa:

## Resumen tecnico

Describa de forma concreta el cambio, el invariante de negocio protegido y el alcance en backend.

## Evidencia obligatoria

- [ ] Ejecucion de `./scripts/verify-governance.sh --phase N`
- [ ] Evidencia de pruebas ejecutadas
- [ ] Evidencia de secuencia TDD (`test`, `feat`, `refactor`)
- [ ] Verificacion de limites de arquitectura hexagonal

## Checklist de gobernanza

- [ ] No se trabajo en `main`
- [ ] No existen commits directos en `develop`
- [ ] La rama sigue patron `feature/backend-ia-native-phase-*`
- [ ] El alcance se mantiene en `rlapp-backend`
- [ ] No hay merge prematuro a `develop`

## Checklist de calidad

- [ ] Pruebas unitarias y de aplicacion en verde
- [ ] Integracion validada o justificada por entorno
- [ ] Casos negativos cubiertos
- [ ] Riesgos documentados

## Simulacion de mutaciones

Incluya tabla defecto -> prueba que falla:

| Defecto simulado | Prueba detectora | Resultado |
| --- | --- | --- |
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |

## Human check

### Unit test complejo

- Dependencias mockeadas:
- Invariante protegida:
- Cambio productivo que lo haria fallar:

### Integration test

- Dependencias reales o fakes:
- Invariante protegida:
- Cambio productivo que lo haria fallar:

## Aprobaciones

- [ ] Revisor tecnico
- [ ] Aprobacion de gobernanza
- [ ] Aprobacion final para merge
