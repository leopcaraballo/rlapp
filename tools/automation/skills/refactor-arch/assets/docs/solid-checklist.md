# SOLID Verification Checklist

## Per-Component Analysis

### SRP — Single Responsibility Principle

- [ ] ¿Cada clase tiene una sola razón para cambiar?
- [ ] ¿Los controllers solo reciben/responden HTTP, sin lógica de negocio?
- [ ] ¿Los services de dominio no manejan persistencia ni mensajería?
- [ ] ¿Los repositories solo hacen operaciones de datos?

**Cómo verificar:**

```bash
# Buscar clases que mezclan responsabilidades
grep -rn "class.*Service" backend/*/src/ | head -20
# Revisar que no importen infraestructura directamente
```

### OCP — Open/Closed Principle

- [ ] ¿Se pueden agregar nuevos adaptadores sin modificar el dominio?
- [ ] ¿Los puertos de salida son interfaces, no clases concretas?
- [ ] ¿Nuevas features se agregan creando nuevas clases, no editando existentes?

**Evidencia requerida:** Crear un segundo adaptador de repositorio (ej. `InMemoryAppointmentRepository`) y demostrar que funciona sin cambiar el dominio.

### LSP — Liskov Substitution Principle

- [ ] ¿Los adaptadores pueden sustituirse sin alterar el comportamiento esperado?
- [ ] ¿El `InMemoryRepository` cumple el mismo contrato que `MongooseRepository`?
- [ ] ¿No se lanzan excepciones inesperadas en implementaciones alternativas?

### ISP — Interface Segregation Principle

- [ ] ¿Las interfaces de puertos son pequeñas y específicas?
- [ ] ¿Ningún adaptador implementa métodos que no necesita?
- [ ] ¿Se separaron interfaces de lectura y escritura si aplica?

**Anti-patrón a evitar:**

```typescript
// Interface demasiado grande
interface AppointmentRepository {
  save(a: Appointment): Promise<Appointment>;
  findAll(): Promise<Appointment[]>;
  delete(id: string): Promise<void>;
  generateReport(): Promise<Report>; // ← No pertenece aquí
}

// Interfaces segregadas
interface AppointmentWriter {
  save(a: Appointment): Promise<Appointment>;
}
interface AppointmentReader {
  findAll(): Promise<Appointment[]>;
}
```

### DIP — Dependency Inversion Principle

- [ ] ¿El dominio define interfaces (puertos) que la infraestructura implementa?
- [ ] ¿Se usa inyección de dependencias para conectar puertos con adaptadores?
- [ ] ¿Ningún `import` en `domain/` apunta a `infrastructure/`?

**Cómo verificar:**

```bash
# DEBE dar 0 resultados
grep -rn "using .*Infrastructure\|using Npgsql\|using RabbitMQ.Client\|using Microsoft.AspNetCore" rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain
```

## Design Patterns Checklist

| Categoría      | Patrón     | ¿Implementado? | Ubicación                                                | Justificación                            |
| -------------- | ---------- | :------------: | -------------------------------------------------------- | ---------------------------------------- |
| Creacional     | Factory    |      [ ]       | `domain/entities/`                                       | Encapsular validación al crear entidades |
| Estructural    | Repository |      [ ]       | `domain/ports/outbound/` → `infrastructure/persistence/` | Abstraer persistencia                    |
| Estructural    | Adapter    |      [ ]       | `infrastructure/*/`                                      | Conectar tech concreta a puertos         |
| Comportamiento | Strategy   |      [ ]       | `infrastructure/messaging/`                              | ack/nack según tipo de error             |
| Comportamiento | Observer   |      [ ]       | `infrastructure/web/`                                    | Notificaciones WebSocket                 |

## Verification Command

```bash
# Script completo de verificación
echo "=== Domain Isolation ==="
echo "Imports prohibidos en domain/:"
grep -rn "using Npgsql\|using RabbitMQ.Client\|using Microsoft.AspNetCore" rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain && echo "FALLÓ" || echo "Domain limpio"

echo ""
echo "=== Ports Defined ==="
find rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Application/Ports -name "*.cs" 2>/dev/null | wc -l

echo ""
echo "=== Adapters Implemented ==="
find rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Infrastructure -name "*.cs" 2>/dev/null | wc -l
```
