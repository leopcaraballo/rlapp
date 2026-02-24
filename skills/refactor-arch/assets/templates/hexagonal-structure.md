# Estructura Hexagonal de Referencia

## Backend — Producer

```
backend/producer/src/
├── domain/
│   ├── entities/
│   │   └── appointment.entity.ts        ← Clase pura, sin decoradores NestJS/Mongoose
│   ├── value-objects/
│   │   ├── id-card.vo.ts                ← Validación de cédula encapsulada
│   │   └── priority.enum.ts             ← Enum de prioridad
│   ├── ports/
│   │   ├── inbound/
│   │   │   └── create-appointment.port.ts   ← Interface del caso de uso
│   │   └── outbound/
│   │       ├── appointment.repository.ts    ← Interface de persistencia
│   │       └── message-publisher.port.ts    ← Interface de mensajería
│   └── services/
│       └── appointment-domain.service.ts    ← Lógica de negocio pura
├── application/
│   ├── use-cases/
│   │   └── create-appointment.use-case.ts   ← Orquestación (usa puertos)
│   └── dtos/
│       └── create-appointment.dto.ts        ← DTO con class-validator
├── infrastructure/
│   ├── persistence/
│   │   ├── schemas/
│   │   │   └── appointment.schema.ts        ← Schema Mongoose
│   │   └── mongoose-appointment.repository.ts  ← Implementa AppointmentRepository
│   ├── messaging/
│   │   └── rabbitmq-publisher.adapter.ts    ← Implementa MessagePublisher
│   ├── web/
│   │   ├── appointments.controller.ts       ← REST adapter (entrada)
│   │   └── appointments.gateway.ts          ← WebSocket adapter (entrada)
│   └── config/
│       └── appointments.module.ts           ← Wiring de NestJS (DI)
```

## Backend — Consumer

```
backend/consumer/src/
├── domain/
│   ├── entities/
│   │   └── appointment.entity.ts
│   ├── ports/
│   │   ├── inbound/
│   │   │   └── process-appointment.port.ts
│   │   └── outbound/
│   │       ├── appointment.repository.ts
│   │       └── notification.gateway.ts
│   └── services/
│       └── scheduler-domain.service.ts      ← Lógica de asignación pura
├── application/
│   └── use-cases/
│       ├── process-appointment.use-case.ts
│       └── assign-office.use-case.ts
├── infrastructure/
│   ├── persistence/
│   │   └── mongoose-appointment.repository.ts
│   ├── messaging/
│   │   └── rabbitmq-consumer.adapter.ts     ← Listener de cola
│   ├── web/
│   │   └── notification-ws.adapter.ts       ← WebSocket para notificar
│   └── config/
│       └── consumer.module.ts
```

## Regla de Dependencia

```
infrastructure/ ──→ application/ ──→ domain/
     (Adapters)      (Use Cases)      (Entities + Ports)
```

- `infrastructure/` puede importar de `application/` y `domain/`
- `application/` puede importar de `domain/`
- `domain/` NO puede importar de `application/` ni `infrastructure/`
