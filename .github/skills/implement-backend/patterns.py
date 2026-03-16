"""
patterns.py — Referencia minima para recordar el flujo real del backend RLAPP.

El backend del repositorio es .NET y vive en `apps/backend/`.
No usar este archivo como plantilla de codigo Python.

Patron esperado:
1. Definir DTOs, Commands y Handlers en `WaitingRoom.Application`.
2. Mantener invariantes y eventos en `WaitingRoom.Domain`.
3. Implementar persistencia, proyecciones e integraciones en `WaitingRoom.Infrastructure`.
4. Registrar endpoints, filtros y dependencias en `WaitingRoom.API/Program.cs`.

Para detalles, leer:
- `.github/instructions/backend.instructions.md`
- `apps/backend/README.md`
"""
