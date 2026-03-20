-- Migration: 20260319_001_AddRegistrationDateToPatients.sql
-- Purpose: Add per-day uniqueness to patient identity registry
--          Spec requires: "patientIdentity es único por día" (unique per day)
-- Author: Database Agent - ASDD Patient-Centric Refactor (SPEC-001)
-- Date: 2026-03-19
--
-- CONTEXT:
-- The original schema enforced UNIQUE(patient_identity) globally, which prevented
-- the same person from ever registering again on a different day.
-- This migration changes the constraint to UNIQUE(patient_identity, registration_date)
-- so that each person may register once per calendar day.
--
-- Also adds aggregate_type column to waiting_room_events if missing (test DB parity fix).

BEGIN;

-- Step 1: Add registration_date to waiting_room_patients (if not present)
ALTER TABLE waiting_room_patients
    ADD COLUMN IF NOT EXISTS registration_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Step 2: Backfill registration_date from created_at for existing rows
UPDATE waiting_room_patients
SET registration_date = created_at::date
WHERE registration_date = CURRENT_DATE
  AND created_at::date < CURRENT_DATE;

-- Step 3: Drop the old global identity unique index
DROP INDEX IF EXISTS ux_waiting_room_patients_identity;

-- Step 4: Create per-day unique index
CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_patients_identity_date
    ON waiting_room_patients (patient_identity, registration_date);

-- Step 5: Add aggregate_type to waiting_room_events (needed for patient-centric model)
ALTER TABLE waiting_room_events
    ADD COLUMN IF NOT EXISTS aggregate_type TEXT;

-- Step 6: Backfill aggregate_type for existing events
--   Old WaitingQueue events → 'WaitingQueue'; new Patient/ConsultingRoom rows will be set correctly
UPDATE waiting_room_events
SET aggregate_type = 'WaitingQueue'
WHERE aggregate_type IS NULL;

-- Step 7: Set NOT NULL now that all rows have a value
ALTER TABLE waiting_room_events
    ALTER COLUMN aggregate_type SET NOT NULL;

-- Step 8: Add index on aggregate_type if missing
CREATE INDEX IF NOT EXISTS ix_waiting_room_events_aggregate_type
    ON waiting_room_events (aggregate_type);

COMMIT;
