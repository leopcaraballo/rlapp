# Checklist de auditoría de PR backend (canónico)

## Validaciones mínimas

- [ ] El cambio se alinea al código real y no a documentación histórica.
- [ ] No introduce dependencias de infraestructura en dominio.
- [ ] Mantiene separación comando/consulta.
- [ ] Conserva garantías de idempotencia y concurrencia en persistencia de eventos.
- [ ] Incluye pruebas o evidencia de no regresión para la capa modificada.
- [ ] No agrega secretos hardcodeados.
- [ ] Actualiza documentación canónica si cambia comportamiento funcional.

## Señales de rechazo

- [ ] Cambios en dominio con acoplamiento a framework/infraestructura.
- [ ] Endpoints nuevos sin validación de request ni manejo de errores.
- [ ] Cambios de flujo clínico sin actualización de invariantes o tests.
- [ ] Documentación descriptiva de intenciones no implementadas.
