# Performance Considerations and Gates - rlapp-patient-centric-refactor

## Estado de SLAs en la spec
La spec menciona objetivos de SLA para latencia de endpoints y throughput de consultorios por hora, pero no fija umbrales numéricos cerrados.

## Supuestos operativos para baseline inicial
Hasta que producto/arquitectura definan SLAs contractuales finales, se sugiere validar contra umbrales provisionales:
- P95 lectura critica (estado Paciente, waiting, ocupancia): menor o igual a 800 ms.
- P95 comando critico (assign-room, start-consultation, validate-payment): menor o igual a 1200 ms.
- Tasa de error HTTP total: menor a 1% durante carga estable.
- Throughput objetivo inicial: al menos 120 requests por segundo combinados en endpoints de alto tráfico.

## Flujos performance prioritarios
1. Registro y paso a WAITING en horas pico.
2. Asignación paralela a múltiples Consultorios.
3. Inicio/fin de consulta con escritura de evento + actualización de proyección.
4. Llegada a caja y validación de pago.
5. Lecturas operativas en tiempo real con fallback (waiting list, ocupancia, cashier queue).

## Plan de pruebas sugerido

| Tipo | Objetivo | Carga sugerida | Duracion | Gate |
|---|---|---|---|---|
| Load | Validar operación esperada diaria | rampa a 120 VUs, estable 20 min | 24 min | Obligatorio pre-release |
| Stress | Detectar punto de quiebre y degradación controlada | escalar 120 -> 300 -> 450 VUs | 35-45 min | Obligatorio para cambio mayor |
| Spike | Medir recuperación ante pico de demanda | base 60 VUs, pico 600 VUs en 30s | 20 min | Recomendado antes de despliegue productivo |
| Soak | Identificar fugas y agotamiento de recursos | 120 VUs constantes | minimo 120 min | Obligatorio para salida estable |

## Gates de performance propuestos
1. Gate P95
- Ningún endpoint crítico supera P95 de 1200 ms en Load.

2. Gate de error
- Error rate global menor a 1% y error rate en endpoints de pago menor a 0.3%.

3. Gate de consistencia eventual
- Lag de proyección menor a 2 segundos al P95 bajo carga Load.

4. Gate de estabilidad prolongada
- Soak de al menos 120 minutos sin degradación progresiva de memoria, conexiones o latencia.

5. Gate de recuperación
- En Spike, recuperación al baseline operativo en menos de 5 minutos tras el pico.

## Instrumentación y observabilidad requerida
- Correlación de métricas de aplicación con CPU, RAM, conexiones DB y cola de outbox.
- Trazas con correlationId en comandos críticos.
- Métrica explícita de lag entre evento persistido y proyección reflejada.

## Gaps que requieren acción de ingeniería
1. Definir SLAs numéricos oficiales en la spec (P95/P99, throughput por rol, error budgets).
2. Publicar script reproducible de pruebas de carga (k6 o equivalente) en repositorio.
3. Añadir dashboard de performance con alertas para lag de proyección y fallos de outbox.

## Criterio de avance recomendado
Puede avanzar a IMPLEMENTED con condición de riesgo controlado si se cumple baseline Load + Stress y se agenda Soak como gate obligatorio previo a release productivo.