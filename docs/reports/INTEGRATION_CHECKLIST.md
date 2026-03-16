# Verificación de Integración Frontend-Backend

## Cambios realizados

### 1. CSP (Content-Security-Policy) - Permitir conexiones al backend

**Archivo**: [apps/frontend/src/proxi.ts](apps/frontend/src/proxi.ts#L70-L85)

Se actualizó la política de seguridad para permitir conexiones HTTP/WebSocket al backend:

```typescript
connect-src 'self' http://localhost:5000 http://api:8080 ws://localhost:5000 ws://api:8080
```

**Por qué**: El navegador bloquea conexiones a orígenes diferentes sin esta configuración.

### 2. Variables de entorno - URLs correctas en Docker

**Archivo 1**: [docker-compose.yml](docker-compose.yml#L141-L145)

Frontend ahora usa la dirección interna de Docker:

```yaml
NEXT_PUBLIC_API_BASE_URL: http://api:8080
NEXT_PUBLIC_WS_URL: http://api:8080
```

**Archivo 2**: [apps/frontend/.env.local](apps/frontend/.env.local#L2-L6)

Actualizado para coincidir con docker-compose.yml:

```
NEXT_PUBLIC_API_BASE_URL=http://api:8080
NEXT_PUBLIC_WS_URL=http://api:8080
```

**Por qué**: Desde dentro de un contenedor Docker, `localhost` se refiere al mismo contenedor, no al host. El nombre del servicio `api` es accesible a través de la red Docker interna en puerto 8080 (puerto interno del contenedor).

## Cómo verificar la integración

### Opción 1: Desde el host (localhost)

Accede a <http://localhost:3001> en tu navegador y abre la consola (F12).

Ejecuta este código en la consola:

```javascript
fetch('http://localhost:5000/health/live')
  .then(r => r.text())
  .then(d => console.log('Backend response:', d))
  .catch(e => console.error('Error:', e.message))
```

**Resultado esperado**: Debería imprimir `Backend response: Healthy`

### Opción 2: Desde dentro del contenedor frontend

```bash
docker exec rlapp-frontend wget -q -O - http://api:8080/health/live
```

**Resultado esperado**: Imprime `Healthy`

### Opción 3: Prueba completa desde el frontend

En la navegación del frontend en <http://localhost:3001>, intenta:

1. Ir a la sección de Reception
2. Hacer un check-in de paciente
3. Verificar en la consola (F12) que no hay errores de CORS o de red

En la consola debería ver logs de peticiones exitosas (status 200, 201, etc.) sin errores de CORS.

## Mapa de puertos y direcciones

| Servicio | Desde host | Desde contenedor | Puerto interno |
| --- | --- | --- | --- |
| Frontend | localhost:3001 | N/A | 3000 |
| Backend API | localhost:5000 | <http://api:8080> | 8080 |
| PostgreSQL | localhost:5432 | postgres:5432 | 5432 |
| RabbitMQ | localhost:5672 | rabbitmq:5672 | 5672 |

## Troubleshooting

Si aún tienes problemas:

1. **Verificar logs del frontend**:

   ```bash
   docker logs rlapp-frontend -f
   ```

   Busca mensajes sobre "Reload env" o errores de compilación.

2. **Verificar logs del backend**:

   ```bash
   docker logs rlapp-api -f
   ```

   Busca errores de conexión o CORS.

3. **Verificar CSP headers**:

   ```bash
   curl -I http://localhost:3001/ | grep -i "Content-Security-Policy"
   ```

4. **Reiniciar stack completo**:

   ```bash
   ./clean.sh all --volumes && ./start.sh all --build
   ```

## Status actual

✅ Frontend levantado en <http://localhost:3001>
✅ Backend API operacional en <http://localhost:5000>
✅ CSP permite conexiones internas y externas
✅ Variables de entorno configuradas correctamente
✅ Red Docker funcional

La integración está lista para pruebas manuales.
