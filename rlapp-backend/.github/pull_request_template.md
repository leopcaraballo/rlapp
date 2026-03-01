# Plantilla de cumplimiento para solicitud de incorporación de cambios (PR)

> **Importante:** esta plantilla es obligatoria para todos los PR del backend.

## Tipo de cambio

- [ ] Funcionalidad nueva (sin ruptura)
- [ ] Corrección de error
- [ ] Cambio con ruptura
- [ ] Actualización documental
- [ ] Refactorización técnica
- [ ] Mejora de pruebas

## Resumen del cambio

Describa de forma breve el objetivo del PR y su impacto funcional.

## Alcance técnico

- [ ] Solo modifica archivos de `rlapp-backend/`.
- [ ] Respeta límites de arquitectura hexagonal.
- [ ] No introduce acoplamiento dominio-infraestructura.
- [ ] Mantiene separación entre commands y queries.

## Impacto en arquitectura y dominio

- [ ] No cambia invariantes del dominio.
- [ ] Si cambia invariantes, documenta decisión y justificación.
- [ ] Si hay cambio arquitectónico, incluye ADR o referencia equivalente.

## Pruebas y calidad

- [ ] Pruebas unitarias actualizadas o agregadas.
- [ ] Pruebas de integración para rutas críticas (si aplica).
- [ ] Resultado local de pruebas: `dotnet test` exitoso.
- [ ] No se degradan métricas de calidad relevantes.

### Evidencia de ejecución

Incluya commands y salida resumida:

```bash
dotnet build
dotnet test
```

## Seguridad y cumplimiento

- [ ] Sin secretos hardcodeados.
- [ ] Sin dependencias no aprobadas.
- [ ] Sin cambios de infraestructura no justificados.

## Documentación

- [ ] Documentación canónica actualizada en `rlapp-backend/docs/`.
- [ ] Se registró la interacción en `AI_WORKFLOW.md` cuando aplica.
- [ ] Se actualizó deuda técnica si se resolvió o detectó nueva deuda.

## Riesgos y plan de reversión

- Riesgo principal:
- Estrategia de reversión:
- Señales de monitoreo post-despliegue:

## Lista final antes de solicitar revisión

- [ ] El PR tiene alcance acotado y comprensible.
- [ ] Las validaciones automáticas pasan.
- [ ] El mensaje de cambio es claro y verificable.
- [ ] Se adjuntó contexto suficiente para revisión técnica.

## Aprobación del autor

- [ ] Confirmo que revisé esta plantilla completa.
- [ ] Confirmo que el contenido refleja el estado real del código.
