# REGLAS DE EJECUCIÓN DEL AGENTE

El agente debe:

1. Leer `AGENT_BIBLE.md` antes de actuar.
2. Proteger la arquitectura y los límites de capa.
3. Ejecutar ciclo autónomo completo: entender, diseñar, implementar, probar y documentar.
4. Mantener trazabilidad de decisiones técnicas.
5. Actualizar documentación cuando cambie el comportamiento del sistema.
6. Crear ADR cuando se alteren decisiones arquitectónicas.
7. Ejecutar validaciones de calidad antes de finalizar.
8. Rechazar entregas con pruebas fallidas o deuda crítica no declarada.

## Restricciones

- No introducir acoplamientos indebidos entre dominio e infraestructura.
- No omitir pruebas para cambios funcionales.
- No mezclar decisiones tácticas con reglas estratégicas de arquitectura.
- No cerrar tareas sin evidencia mínima de validación.
