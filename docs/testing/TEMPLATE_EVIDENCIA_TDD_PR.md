# Plantilla de evidencia TDD por PR

## 1) Contexto del cambio

- PR: <url-o-id>
- Rama: <branch>
- Fecha: <YYYY-MM-DD>
- Responsable: <nombre>
- Alcance funcional: <resumen breve>
- Riesgo de negocio: Bajo | Medio | Alto

## 2) RED (falla inicial esperada)

### 2.1 Prueba agregada/ajustada antes del código productivo

- Archivo(s) de prueba:
  - <ruta>
- Caso(s) de prueba:
  - <nombre del test>cambiar
cambiar
### 2.2 Evidencia de falla

- Comando ejecutado:
  - `dotnet test rlapp-backend/RLAPP.slnx --filter "<filtro>"`
  - `npm test -- --runInBand --testPathPattern="<patrón>"`
- Resultado observado:
  - <mensaje de error / assert fallido>
- Captura o log:
  - <enlace o referencia>

## 3) GREEN (implementación mínima)

### 3.1 Cambio mínimo en producción

- Archivo(s) modificados:
  - <ruta>
- Regla de negocio implementada:
  - <descripción concreta>

### 3.2 Evidencia de paso

- Comando ejecutado:
  - `dotnet test rlapp-backend/RLAPP.slnx --filter "<filtro>"`
  - `npm test -- --runInBand --testPathPattern="<patrón>"`
- Resultado observado:
  - <tests en verde>

## 4) REFACTOR (sin alterar comportamiento)

### 4.1 Mejoras realizadas

- Refactor aplicado:
  - <nombres, extracción, simplificación, puertos/adaptadores, etc.>
- Archivos impactados:
  - <ruta>

### 4.2 Evidencia de no regresión

- Comando de regresión:
  - `dotnet test rlapp-backend/RLAPP.slnx --configuration Release --verbosity minimal`
  - `cd rlapp-frontend && npm test -- --runInBand`
- Resultado:
  - <sin regresiones>

## 5) Verificación técnica (¿está bien construido?)

Marcar cada punto:

- [ ] Cobertura de regla crítica agregada o ajustada
- [ ] Pruebas unitarias pasan
- [ ] Pruebas de integración relevantes pasan
- [ ] Sin cambios no intencionales en contratos públicos
- [ ] Linter/estándares del proyecto sin errores

## 6) Validación funcional (¿resuelve la necesidad del negocio?)

- Escenario de negocio validado:
  - Dado <contexto>
  - Cuando <acción>
  - Entonces <resultado esperado>
- Evidencia funcional:
  - <test de aceptación, flujo manual, evidencia de API/UI>
- Resultado:
  - <cumple / no cumple>

## 7) Trazabilidad por commits

- `test:` <commit hash corto> — prueba en rojo
- `feat:` o `fix:` <commit hash corto> — paso a verde
- `refactor:` <commit hash corto> — limpieza sin cambio funcional

## 8) Criterio de aprobación

- [ ] Red documentado
- [ ] Green documentado
- [ ] Refactor documentado
- [ ] Verificación técnica completa
- [ ] Validación funcional completa
- [ ] Evidencia adjunta (logs/capturas/enlaces)

## 9) Observaciones del revisor

- Comentarios:
  - <pendiente>
- Decisión:
  - Aprobado | Requiere ajustes
