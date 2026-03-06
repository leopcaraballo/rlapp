# Pull Request: Implementación de Pipeline CI/CD Multinivel y Documentación de Testing

## Descripción
Este Pull Request introduce el pipeline automatizado integral para el ecosistema RLAPP, estableciendo la infraestructura y estrategias requeridas para las validaciones continuas de seguridad y calidad reportadas en el Sprint actual (Tareas J3, J4, y J5).

## Tareas Completadas (Plan de Equipo Jhorman)

### Tarea J3: Pipeline CI/CD Multinivel (`.github/workflows/ci.yml`)
- Implementado flujo en base a GitHub Actions con los siguientes jobs encadenados:
  - `lint-and-build`: Compilación base, validación estática y empaquetado del frontend exportando un payload estático ciego (SSG).
  - `component-tests`: Ejecución aislada de unit tests en entorno hermético usando mocks. 
  - `integration-tests`: Pruebas mediante infraestructura real. Se adjuntaron servicios efímeros en Docker listos para uso (`PostgreSQL` + `RabbitMQ`) y se delegó la configuración al `dotnet test`.
  - `black-box-tests`: Spin-up dockerizado del ecosistema y llamadas de aserción al entrypoint (API Health checks, endpoints swagger).
  - `image-scan`: Incorporado escáner Trivy al pipeline para las imágenes en su estado pre-registry.

### Tarea J4: Pruebas de componente frontend en CI (`rlapp-frontend/package.json`)
- Creado el script específico `test:component` segregando intencionalmente los artefactos de la carpeta /e2e/ para evitar arranques fallidos por ausencia de backend.
  - Ejecución conectada directamente al action step del frontend asegurando reportes completos sobre Statements, Branches y Lines.

### Tarea J5: Documentación y Estrategia Central (HITL)
- Introducidos formalmente dentro del control de versiones los documentos `TEST_PLAN.md` y `PLAN_EQUIPO.md`.
- Se registra la jerarquía y táctica (Caja Blanca vs Negra) implementada en QA aplicable sobre Event Sourcing y los postulados en Playwright + MSW + xUnit.

## Evidencia / Tipo de Cambios
- [x] ✨ **Nueva funcionalidad** (Nuevo script npm y GitHub action pipeline)
- [x] 📖 **Documentación** (Archivos Markdown anexados)
- [x] ⚙️ **CI/CD Configuration**

## Testing y Consideraciones
- Los logs en el pipeline garantizarán la subida de los archivos `test-results.trx` y `coverage/`.
- El Pull Request sobre `develop` debería activar inmediatamente un dry-run mostrando cada paso de este Action planificado.
- Verificación exhaustiva local indica que los comandos `.yml` emiten el resultado de "Exited with code 0" aislando las dependencias del host.

---
*Coautor:* GitHub Copilot.
