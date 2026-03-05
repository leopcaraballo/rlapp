# Context: Project and architecture

## 1. Project Overview

Real-time medical appointment management system. Patients register appointments via REST API, they are processed asynchronously through message queues, and displayed on a dashboard with real-time WebSocket updates.

### Architecture

- **Pattern:** Event-Driven Microservices (Producer → RabbitMQ → Consumer)
- **Flow:** REST API → Publish → Queue → Consume → MongoDB → WebSocket → Dashboard

### Key Folder Structure

```
├── .github/copilot-instructions.md  ← Orchestrator (Copilot Adapter)
├── GEMINI.md                        ← Orchestrator (Gemini Kernel)
├── docs/agent-context/              ← Context Modules (Project, Rules, Workflow)
├── DEBT_REPORT.md                   ← Consolidated status of feedback and technical debt
├── AI_WORKFLOW.md                   ← Methodology documentation for humans
├── skills/                  ← Skills for sub-agents
├── backend/
│   ├── producer/src/        ← REST API, DTOs, WebSocket Gateway
│   └── consumer/src/        ← Scheduler, assignment logic
├── frontend/src/            ← Next.js pages, components
└── docker-compose.yml
```

## 2. Tech Stack

| Layer          | Technology      | Version        | Notes                          |
| -------------- | --------------- | -------------- | ------------------------------ |
| Backend        | NestJS          | ^10.x          | TypeScript, two microservices  |
| Frontend       | Next.js         | ^15.x          | App Router, CSS Modules        |
| Database       | MongoDB         | 7.x            | Mongoose ODM                   |
| Messaging      | RabbitMQ        | 3.x-management | amqplib, durable queues        |
| Real-time      | Socket.IO       | ^4.x           | WebSocket Gateway in Producer  |
| Infrastructure | Docker Compose  | v2             | Multi-container orchestration  |
| Testing        | Jest            | ^29.x          | NestJS Testing Module          |
| Validation     | class-validator | ^0.14.x        | DTOs with decorators           |
