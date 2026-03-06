## Release v1.0.0

### Features incluidas
- **feature/hardened-dockerfiles**: Dockerfiles multi-stage (backend y frontend standalone), ejecuciones no-root y preparación para escaneo de seguridad.
- **feature/ci-pipeline**: Pipeline CI/CD multinivel con 5-6 jobs bien definidos asegurando compilación, testing y salud general.
- **feature/test-classification**: Tests debidamente clasificados para distinguir componente (Caja Blanca / mocks) vs integración (DB e Infra reales).
- **feature/black-box-test**: Prueba de Caja Negra vía cliente HTTP contra contenedor en vivo ejecutándose en el CI/CD.
- **feature/test-plan**: Entregable de `TEST_PLAN.md` auditado con informe profesional detallando cobertura técnica de los niveles 1, 2 y 3.

### Procedimientos de Calidad
- Pruebas unitarias de Backend (xUnit) y Frontend (Jest) pasando al 100%.
- Pruebas de integración .NET interactuando genuinamente con contenedores de RabbitMQ y PostgreSQL efímeros.
- Gobernanza de IA y registro de decisiones de arquitectura formalmente documentados en `AI_WORKFLOW.md`.

### Instrucciones de Fusión y Tagging (GitFlow)
1. Aprobar este Pull Request de liberación.
2. Al ejecutar el "Merge pull request", realizar "Create a new release" o ejecutar en línea de comandos la creación del tag semántico apuntando al último commit de `main`:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release v1.0.0 - Pipeline CI/CD, Seguridad y Pruebas"
   git push origin v1.0.0
   ```