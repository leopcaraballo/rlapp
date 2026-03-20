# RLAPP Refactorización - Quick Reference Card
**Print this and keep it on your desk** 📌

---

## 🎯 The Big Picture

```
BEFORE:                          AFTER:
┌───────────────┐               ┌──────────┐    ┌──────────────┐
│  WaitingQueue │               │ Patient  │    │ ConsultingRm │
│  (q-centric)  │      ──→      │(p-centric)   │  (secondary) │
└───────────────┘               └──────────┘    └──────────────┘
  • Sequential                    • Parallel
  • 1 patient at a time          • N consultations
  • Global state                  • Independent states
```

---

## 📊 Patient State Machine

```
REGISTERED → WAITING → ASSIGNED → IN_CONSULTATION → FINISHED_CONSULTATION
                ↓                       ↓                    ↓
           (receptionist         (doctor starts)      AT_CASHIER
            marks ready)         (doctor finishes)    ↓
                                                  PAYMENT_VALIDATED
                                                      ↓
                                                 COMPLETED

Terminal States:
├─ ABSENT_AT_CONSULTATION
├─ ABSENT_AT_CASHIER
└─ CANCELLED_BY_PAYMENT
```

---

## 🔧 Key Aggregates

### Patient
```csharp
// Factory
Patient.Create(
  patientId: "UUID",
  identity: new PatientIdentity("12345678"),  // cedula
  patientName: "John Doe",
  phoneNumber: "555-1234",
  metadata: eventMetadata
);

// Commands
patient.MarkAsWaiting(request);
patient.AssignConsultingRoom(request);
patient.StartConsultation(request);
patient.FinishConsultation(request);
patient.ArriveCashier(request);
patient.ValidatePayment(request);
patient.Complete(request);
```

### ConsultingRoom
```csharp
// Factory
ConsultingRoom.Create(
  roomId: "ROOM-001",
  roomName: "Dr. Garcia",
  metadata: eventMetadata
);

// Commands
room.Activate(request);           // Admin only
room.Deactivate(request);         // Admin only
```

---

## 📝 Key Events (to emit)

### Patient
```
PatientRegistered
PatientMarkedAsWaiting
PatientConsultingRoomAssigned
PatientConsultationStarted
PatientConsultationFinished
PatientArrivedAtCashier
PatientPaymentValidated
PatientCompleted
PatientMarkedAbsentAtConsultation
PatientMarkedAbsentAtCashier
```

### ConsultingRoom
```
ConsultingRoomCreated
ConsultingRoomActivated
ConsultingRoomDeactivated
ConsultingRoomPatientAssigned
ConsultingRoomPatientLeft
```

---

## 🎮 API Endpoints (by Role)

### Public (ANY)
```
POST   /api/patients/register
GET    /api/patients/{id}/state
```

### Receptionist
```
POST   /api/patients/{id}/mark-waiting
POST   /api/patients/{id}/assign-room
GET    /api/patients/waiting
GET    /api/consulting-rooms/occupancy
```

### Doctor
```
POST   /api/patients/{id}/start-consultation
POST   /api/patients/{id}/finish-consultation
GET    /api/consulting-rooms/occupancy
```

### Cashier
```
POST   /api/patients/{id}/arrive-cashier
POST   /api/patients/{id}/validate-payment
GET    /api/patients/cashier-queue
```

### Administrator
```
POST   /api/consulting-rooms/{roomId}/activate
POST   /api/consulting-rooms/{roomId}/deactivate
GET    /api/consulting-rooms/occupancy
GET    /api/dashboard/metrics
```

---

## 🎬 SignalR Channels (Groups)

```javascript
// Auto-join by role:
Receptionist → ["reception", "waiting-room-display"]
Doctor       → ["consulting-rooms"]
Cashier      → ["cashier"]
Admin        → ["dashboard"]

// Broadcast events:
hub.Clients.Groups("reception").SendAsync("PatientAssigned", {...});
hub.Clients.Groups("waiting-room-display").SendAsync("PatientRegistered", {...});
hub.Clients.Groups("cashier").SendAsync("PatientAtCashier", {...});
hub.Clients.Groups("dashboard").SendAsync("RoomOccupancyChanged", {...});
```

---

## 🧪 Testing Checklist

### Backend
- [ ] Aggregate transitions (unit tests)
- [ ] Invariants validated (unit tests)
- [ ] Event handlers (unit tests)
- [ ] Command handlers (integration tests)
- [ ] Projections update (integration tests)
- [ ] Idempotency keys work ✅

### Frontend
- [ ] Hooks fetch data (unit tests)
- [ ] Components render (unit tests)
- [ ] Patient flow E2E (Cypress)
  - [ ] Register → Waiting → Assigned → Consultation → Cashier → Completed

### Coverage
```
Backend: ≥ 85% line coverage
Frontend: ≥ 80% line coverage
E2E: 8 critical flows ✅
```

---

## 🚀 Implementation Timeline

```
WEEK 1: PHASE 1 (44 hours)
  Day 1-2: Patient + ConsultingRoom aggregates
  Day 3-4: Events + Value Objects + Projections
  Day 5: Tests + Migration (40 unit tests)
  ✅ READY: Aggregates complete

WEEK 2: PHASE 2 (44 hours)
  Day 1-2: Command Handlers (11 handlers)
  Day 3: Query Handlers (4 handlers)
  Day 4: Endpoints + Validation (15+ endpoints)
  Day 5: SignalR + Tests (30 integration tests)
  ✅ READY: Backend complete

WEEK 3: PHASE 3 (36 hours)
  Day 1-2: Hooks (5+ hooks)
  Day 3-4: Components (6+ components)
  Day 5: Pages + Tests (25 frontend tests)
  ✅ READY: Frontend complete

WEEK 4: PHASE 4 + 5 (40 hours)
  Day 1-2: E2E tests (8+ Cypress scenarios)
  Day 3: Performance + Security tests
  Day 4: ADRs + Migration guide
  Day 5: UAT + Sign-off
  ✅ READY: Production canary 15%

WEEK 5: ROLLOUT
  Day 1-3: Canary 50%
  Day 4-5: Full 100% + Monitoring
  ✅ DONE: Production live
```

**Total: ~164 work hours / 4 people = ~4 weeks**

---

## 📊 Read Models (Projections)

```sql
-- patients_state_view
-- Columns: patient_id, patient_identity, patient_name, current_state,
--          assigned_room_id, payment_amount, waiting_started_at, etc.

-- consulting_room_occupancy_view
-- Columns: room_id, room_name, is_active, current_patient_id, 
--          patient_name, attention_started_at

-- waiting_room_display_view
-- For public displays: patient_identity, display_name, state, 
-- waiting_position, waiting_time_minutes

-- cashier_queue_view
-- For cashier: patient_id, patient_name, payment_amount, 
-- arrived_at_cashier_at, payment_attempts

-- completed_patients_view
-- Archive: patient_id, status, total_wait_time_minutes, 
-- consultation_duration_minutes, completed_at
```

---

## ⚠️ Critical Invariants to Validate

```csharp
// PATIENT
✗ Cannot be in two states simultaneously
✗ Cannot be in consultation without assigned room
✗ Cannot go to cashier without finishing consultation
✗ Cannot be assigned two different rooms

// CONSULTING ROOM
✗ Cannot attend two patients simultaneously
✗ Inactive room cannot be assigned new patients
✗ Cannot deactivate room with current patient

// PAYMENT
✗ Payment amount must be > 0
✗ Cannot validate payment twice for same patient

// EVENT SOURCING
✗ Cannot replay event twice (idempotency key unique)
✗ Events must maintain strict ordering per aggregate
```

---

## 🔍 Debugging Checklist

### Events not persisting?
1. Check Event Store table: `waiting_room_events`
2. Verify aggregate_id is in events
3. Check version sequence
4. Ensure metadata is set

### Projections out of sync?
```bash
# Trigger rebuild
curl -X POST http://localhost:5000/api/projections/rebuild

# Check checkpoint
SELECT * FROM projection_checkpoints;
```

### SignalR not broadcasting?
1. Check hub connection: `/api/hub/waiting-room`
2. Verify group membership
3. Check browser console for errors
4. Test with: `hub.invoke("RequestWaitingRoomState")`

### Command failed?
1. Check invariants violation (logs)
2. Verify Auth header + role
3. Test idempotencyKey uniqueness
4. Check payload validation

---

## 📁 File Creation Checklist

### Fase 1 Files to Create
```
✅ Domain/Aggregates/Patient.cs
✅ Domain/Aggregates/ConsultingRoom.cs
✅ Domain/Events/PatientRegistered.cs (+ 11 more)
✅ Domain/ValueObjects/PatientIdentity.cs (+ 2 more)
✅ Domain/Invariants/PatientInvariants.cs (+ 1 more)
✅ Projections/Handlers/PatientStateProjectionHandler.cs (+ 1 more)
```

### Fase 2 Files to Create
```
✅ Application/CommandHandlers/RegisterPatientCommandHandler.cs (+ 10 more)
✅ Application/QueryHandlers/GetPatientStateQueryHandler.cs (+ 3 more)
✅ API/Endpoints/PatientEndpoints.cs
✅ API/Endpoints/ConsultingRoomEndpoints.cs
✅ API/Hubs/WaitingRoomHub.cs (refactor)
✅ Infrastructure/Persistence/IPatientRepository.cs (+ 3 more)
```

### Fase 3 Files to Create
```
✅ app/reception/page.tsx (refactor)
✅ app/medical/page.tsx (refactor)
✅ app/cashier/page.tsx (refactor)
✅ hooks/usePatientState.ts
✅ hooks/useWaitingPatients.ts
✅ hooks/useConsultingRoomOccupancy.ts
✅ components/reception/PatientAssignment.tsx
✅ components/cashier/CashierQueue.tsx
```

---

## 🎯 DON'T FORGET

- [ ] Use `EventMetadata` for every event
- [ ] Always validate invariants before raising events
- [ ] Test idempotency (same command twice = same result)
- [ ] Use `CancellationToken` in async methods
- [ ] Implement event handlers (Apply methods)
- [ ] Update projections when events change
- [ ] Add correlation IDs for tracing
- [ ] Test state transitions thoroughly
- [ ] Document assumptions in ADRs
- [ ] Get code review before merge

---

## 📚 Quick Reference Commands

```bash
# Run backend tests
cd apps/backend && dotnet test RLAPP.slnx

# Run frontend tests
cd apps/frontend && npm test

# Run E2E tests
cd apps/frontend && npx cypress run

# Check code coverage
cd apps/backend && dotnet test /p:CollectCoverage=true

# Start dev environment
docker compose up -d

# Rebuild projections
curl -X POST http://localhost:5000/api/projections/rebuild

# Check event lag
SELECT * FROM event_processing_lag ORDER BY created_at DESC LIMIT 10;

# View outbox status
SELECT status, COUNT(*) FROM waiting_room_outbox GROUP BY status;
```

---

## 🚨 Emergency Rollback

```bash
# 1. Stop deployment
kubectl rollout undo deployment/rlapp-backend

# 2. Restore database from backup
pg_restore -d rlapp_waitingroom < backup-2026-03-19.sql

# 3. Rebuild projections
curl -X POST http://localhost:5000/api/projections/rebuild

# 4. Verify
curl http://localhost:5000/health/ready
```

---

**Print this card • Keep it on your desk • Reference often** 🚀

---

**Last Updated**: 2026-03-19  
**Version**: 1.0 - FINAL
