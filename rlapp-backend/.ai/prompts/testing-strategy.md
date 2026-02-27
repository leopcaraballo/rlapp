# TESTING_STRATEGY.md

**RLAPP — Estrategia oficial de pruebas**

## 1. Principio Fundamental

Si el dominio es correcto → el sistema es correcto.
Las pruebas protegen:

* Invariantes
* Consistencia por eventos
* Idempotencia
* Determinismo
* Reprocesamiento

---

## 2. Pirámide de pruebas RLAPP

### Nivel 1 — Pruebas unitarias (dominio puro) ⭐ CRÍTICO

Sin:

* DB
* HTTP
* Broker
* Infraestructura
* Docker

Validan:

* Invariantes del agregado
* Emisión correcta de eventos
* Reglas del negocio
* Determinismo
* Estados inválidos
* Concurrencia lógica

---

### Nivel 2 — Pruebas de aplicación

Validan:

* Orquestación correcta
* Uso de puertos
* Manejo de comandos
* Transacciones lógicas

Con mocks/fakes — nunca infraestructura real.

---

### Nivel 3 — Pruebas de proyecciones

Validan:

* Proyecciones correctas desde eventos
* Idempotencia
* Reprocesamiento
* Reconstrucción completa

---

### Nivel 4 — Pruebas de integración

Con infraestructura real:

* Event Store
* Broker
* DB lectura
* Outbox
* Retries
* DLQ

---

### Nivel 5 — Pruebas E2E

Validan flujo completo:

Check-in → Cola → Llamado → Monitor → Finalización

---

## 3. Reglas Obligatorias

* El dominio debe pasar pruebas en aislamiento total
* Las pruebas deben ser determinísticas
* Debe validarse reprocesamiento completo
* Debe probarse duplicación de eventos
* Debe probarse idempotencia
* Debe probarse concurrencia

---

## 4. Pruebas especiales de Event Sourcing

* Replay completo desde cero
* Replay con eventos duplicados
* Replay con fallos intermedios
* Evolución de versión de evento
* Snapshot + replay
* Orden incorrecto

---

## 5. Definición de completitud de pruebas

El sistema es seguro si:

* Dominio protegido por pruebas
* Event sourcing reproducible
* Idempotencia garantizada
* Proyecciones reconstruibles
* Sin dependencia de infraestructura en pruebas unitarias
