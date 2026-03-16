"""
Plantilla de referencia para tests de endpoints del backend .NET.

Usar como guia para crear pruebas en:
- apps/backend/src/Tests/WaitingRoom.Tests.Integration/

Patron sugerido:
- WebApplicationFactory para levantar la API en memoria.
- xUnit para la suite.
- FluentAssertions para aserciones legibles.
- Mocks o dobles solo cuando la prueba no sea de integracion real.
"""
