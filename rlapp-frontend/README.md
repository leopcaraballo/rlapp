# RLAPP Frontend

## Resumen

Frontend en Next.js 16 + React 19 para operación de sala de espera médica.

Módulos operativos principales:

- Recepción (`/reception`)
- Caja (`/cashier`)
- Área médica (`/medical`)
- Vista de sala (`/waiting-room/[queueId]`)
- Dashboard (`/dashboard`)

## Integración real con backend

La aplicación consume la API .NET en `NEXT_PUBLIC_API_BASE_URL`.

Canales de actualización:

- Polling REST periódico (base de sincronización)
- SignalR como canal de baja latencia

## Configuración

Crear `.env.local` con:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_WS_DISABLED=false
NEXT_PUBLIC_DEFAULT_QUEUE_ID=QUEUE-01
NEXT_PUBLIC_POLLING_INTERVAL=5000
```

## Ejecución

```bash
cd rlapp-frontend
npm install
npm run dev
```

Aplicación disponible en `http://localhost:3000` (o `3001` en docker compose del proyecto).

## Estructura funcional

- `src/app`: rutas y pantallas
- `src/hooks`: orquestación de estado y casos de uso de UI
- `src/services/api`: endpoint client de sala de espera
- `src/services/signalr`: conexión hub SignalR
- `src/infrastructure/adapters`: HTTP y real-time adapters
- `src/domain`: contratos y modelos de dominio
- `test`: pruebas unitarias y de integración de frontend

## Observaciones técnicas relevantes

- Existe `SocketIoAdapter`, pero el runtime principal usa `SignalRAdapter`.
- El archivo `src/proxi.ts` define middleware de seguridad y rate limiting; verificar convención de activación en Next.js (`middleware.ts`) para asegurar ejecución en producción.
- El frontend envía `X-Correlation-Id` y `X-Idempotency-Key` en commands; el backend usa correlación y la idempotencia se materializa en event store y outbox.

## Pruebas

Pruebas presentes en `test/**` con Jest y e2e con Playwright.

```bash
npm test
npm run test:cov
```
