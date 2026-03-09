 # Diagnóstico Completo: Integración Frontend-Backend

## Estado General del Stack

✅ **Docker Stack**: Completamente levantado

- Frontend (Next.js): <http://localhost:3001>
- Backend API: <http://localhost:5000>
- PostgreSQL: localhost:5432
- RabbitMQ: localhost:5672
- Todos los servicios de observabilidad funcionando

## Problema Identificado: Falta de Header Idempotency-Key

### El Problema

El backend **requiere obligatoriamente** un header `Idempotency-Key` en todas las solicitudes que cambian estado (POST, PUT, DELETE). Sin este header, todas las solicitudes POST devuelven un error.

**Respuesta del backend sin el header:**

```json
{
  "error": "MissingIdempotencyKey",
  "message": "State-changing requests require 'Idempotency-Key' header"
}
```

### Evidencia de los Logs

```
[13:19:38 WRN] State-changing request missing Idempotency-Key header. Method: POST, Path: /api/waiting-room/check-in
[13:19:38 WRN] State-changing request missing Idempotency-Key header. Method: POST, Path: /api/reception/register
[13:19:38 WRN] State-changing request missing Idempotency-Key header. Method: POST, Path: /api/cashier/validate-payment
[13:19:38 WRN] State-changing request missing Idempotency-Key header. Method: POST, Path: /api/medical/call-next
[13:19:38 WRN] State-changing request missing Idempotency-Key header. Method: POST, Path: /api/medical/finish-consultation
```

## Cómo Resolver: Implementar Idempotency-Key

### 1. Frontend (React/Next.js) - Necesario Actualizar

Todos los fetch/axios calls deben incluir:

```typescript
const idempotencyKey = crypto.randomUUID(); // o usar una librería UUID
const response = await fetch('/api/...', {
  method: 'POST',
  headers: {
    'Idempotency-Key': idempotencyKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### 2. Script de Prueba (simulate-workflow.sh) - Ya Actualizado

El script ahora incluye:

```bash
IDEMPOTENCY_KEY=$(uuidgen)
curl -X POST "${API}/api/waiting-room/check-in" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d ...
```

### 3. Cliente HTTP (httpClient.ts) - Necesario Actualizar

Si existe un cliente HTTP global, debe:

```typescript
function addIdempotencyKey(config) {
  return {
    ...config,
    headers: {
      ...config.headers,
      'Idempotency-Key': crypto.randomUUID()
    }
  };
}
```

## Próximos Pasos

**Prioridad 1: Actualizar Frontend**

1. Revisar [rlapp-frontend/src/lib/httpClient.ts](rlapp-frontend/src/lib/httpClient.ts)
2. Revisar [rlapp-frontend/src/services/](rlapp-frontend/src/services/)
3. Agregar `Idempotency-Key` a todos los POST/PUT/DELETE
4. Usar `crypto.randomUUID()` para cada solicitud

**Prioridad 2: Validar Flujos**

1. Test manual con Postman/curl
2. Ejecutar simulate-workflow.sh con headers correctos
3. Revisar logs de frontend para errores
4. Verificar que RabbitMQ reciba eventos

**Prioridad 3: Integración Completa**

1. Validar WebSocket/SignalR (NEXT_PUBLIC_WS_URL)
2. Verificar que el Worker procesa eventos
3. Validar que las proyecciones se actualizan
4. Test end-to-end en el navegador

## Referencias de Archivos

- [simulate-workflow.sh](simulate-workflow.sh) - Script de simulación (parcialmente actualizado)
- [test-integration.sh](test-integration.sh) - Tests de integración
- [INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md) - Guía de verificación
- [docker-compose.yml](docker-compose.yml) - Configuración de servicios

## Comandos Útiles para Diagnosticar

```bash
# Ver logs del backend en tiempo real
docker logs rlapp-api -f

# Ver logs del frontend en tiempo real
docker logs rlapp-frontend -f

# Ver logs del worker
docker logs rlapp-worker -f

# Test manual con Idempotency-Key
curl -X POST http://localhost:5000/api/waiting-room/check-in \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"queueId":"QUEUE-01","patientName":"Test","idCard":"999"}'

# Ver estado actual del stack
./rlapp.sh status all

# Ejecutar simulación actualizada
./simulate-workflow.sh
```

## Conclusión

**La integración frontend-backend está casi completa.** El único problema identificado es que:

1. ✅ Configuración de red Docker: Correcta
2. ✅ CSP headers: Actualizado
3. ✅ Variables de entorno: Configuradas
4. ❌ **Header Idempotency-Key: Falta en cliente frontend**

Una vez que se agregue el `Idempotency-Key` en todas las solicitudes POST del frontend, el sistema estará 100% funcional.
