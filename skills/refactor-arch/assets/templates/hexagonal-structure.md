# Estructura Hexagonal de Referencia

## Backend — WaitingRoom Service

```
rlapp-backend/src/Services/WaitingRoom/
├── domain/
│   ├── entities/
│   │   └── waiting-queue.entity.cs      ← Clase pura, sin dependencias de infraestructura
│   ├── value-objects/
│   │   ├── id-card.vo.ts                ← Validación de cédula encapsulada
│   │   └── priority.enum.ts             ← Enum de prioridad
│   ├── ports/
│   │   ├── inbound/
│   │   │   └── create-appointment.port.ts   ← Interface del caso de uso
│   │   └── outbound/
│   │       ├── event-store.port.cs          ← Interface de persistencia
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
│   │   ├── event-store/
│   │   │   └── postgres-event-store.cs      ← Implementa IEventStore
│   │   └── outbox/
│   │       └── postgres-outbox-store.cs     ← Implementa IOutboxStore
│   ├── messaging/
│   │   └── rabbitmq-publisher.adapter.ts    ← Implementa MessagePublisher
│   ├── web/
│   │   ├── appointments.controller.ts       ← REST adapter (entrada)
│   │   └── appointments.gateway.ts          ← WebSocket adapter (entrada)
│   └── config/
│       └── composition-root.cs              ← Wiring de DI
```

## Backend — Worker

```
rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Worker/
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
│   ├── outbox/
│   │   └── outbox-dispatcher.cs
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
