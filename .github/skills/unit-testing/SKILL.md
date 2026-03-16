---
name: unit-testing
description: Genera tests unitarios e integración para backend y/o frontend. Lee la spec y el código implementado. Requiere spec APPROVED e implementación completa.
argument-hint: "<nombre-feature> [backend|frontend|ambos]"
---

# Unit Testing

## Definition of Done — verificar al completar

- [ ] Cobertura adecuada en la lógica modificada y escenarios criticos de la spec
- [ ] Tests aislados — sin conexión a PostgreSQL, RabbitMQ ni servicios externos reales
- [ ] Escenario feliz + errores de negocio + validaciones de entrada cubiertos
- [ ] Los cambios no rompen contratos existentes del módulo

## Prerequisito — Lee en paralelo

```
.github/specs/<feature>.spec.md        (criterios de aceptación)
código implementado en apps/backend/ y/o apps/frontend/
.github/instructions/tests.instructions.md     (xUnit/Moq/FluentAssertions + Jest/Playwright)
```

## Output por scope

### Backend → `apps/backend/src/Tests/`

| Archivo | Cubre |
|---------|-------|
| `WaitingRoom.Tests.Domain/...` | Reglas de dominio e invariantes |
| `WaitingRoom.Tests.Application/...` | Handlers, validaciones y casos de uso |
| `WaitingRoom.Tests.Integration/...` | Endpoints, persistencia e integraciones necesarias |

### Frontend → `apps/frontend/test/` o `apps/frontend/src/**/__tests__/`

| Archivo | Cubre |
|---------|-------|
| `test/components/<Feature>.test.tsx` | Render + interacciones |
| `test/hooks/use<Feature>.test.tsx` | Estado, efectos, errores |
| `test/e2e/<feature>.spec.ts` | Flujo navegador si la spec lo exige |

## Patrones core

```csharp
// Backend — xUnit + FluentAssertions
[Fact]
public async Task Handle_Should_ReturnExpectedResult()
{
    var repository = new Mock<ISomeRepository>();
    repository.Setup(x => x.LoadAsync(It.IsAny<CancellationToken>())).ReturnsAsync(entity);

    var result = await handler.Handle(command, CancellationToken.None);

    result.Should().NotBeNull();
}
```

```tsx
// Frontend — Jest + Testing Library
jest.mock('@/services/patients');
render(<PatientForm />);
await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
expect(await screen.findByText(/paciente registrado/i)).toBeInTheDocument();
```

## Restricciones

- Solo agregar o ajustar tests necesarios para la feature.
- Nunca conectar a servicios externos reales salvo que la suite de integracion del repo ya lo requiera.
- Si una prueba E2E no es necesaria para la spec, preferir unit/integration tests mas rapidos.
