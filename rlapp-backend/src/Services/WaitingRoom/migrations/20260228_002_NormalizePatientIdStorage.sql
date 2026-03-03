-- Migration: 20260228_002_NormalizePatientIdStorage.sql
-- Purpose: Enforce canonical patient ID normalization at database level
-- Author: Principal Backend Architect - Clinical Systems
-- Date: 2026-02-28
--
-- CLINICAL CONTEXT:
-- Patient identity must be globally unique. The system normalizes to UPPERCASE
-- to ensure case-insensitive equality. This migration enforces normalization
-- at the database level for defense-in-depth.

BEGIN TRANSACTION;

-- Step 1: Normalize existing patient IDs to uppercase (if any exist)
UPDATE waiting_room_patients
SET patient_id = UPPER(TRIM(patient_id))
WHERE patient_id IS NOT NULL AND patient_id != UPPER(TRIM(patient_id));

-- Step 2: Recreate the unique index with functional normalization
-- This ensures new inserts are normalized at DB level
DROP INDEX IF EXISTS ux_waiting_room_patients_patient_id;

CREATE UNIQUE INDEX ux_waiting_room_patients_patient_id
    ON waiting_room_patients (UPPER(TRIM(patient_id)));

-- Step 3: Add constraint to prevent NULL or empty patient IDs
-- (if not already present from initial schema)
ALTER TABLE waiting_room_patients
    ALTER COLUMN patient_id SET NOT NULL;

ALTER TABLE waiting_room_patients
    ADD CONSTRAINT chk_patient_id_not_empty
        CHECK (patient_id IS NOT NULL AND LENGTH(TRIM(patient_id)) > 0)
        NOT VALID;

-- Validate constraint after migration
ALTER TABLE waiting_room_patients
    VALIDATE CONSTRAINT chk_patient_id_not_empty;

-- Step 4: Add character validation constraint
-- Patient IDs can only contain letters, numbers, hyphens, dots
ALTER TABLE waiting_room_patients
    ADD CONSTRAINT chk_patient_id_format
        CHECK (patient_id ~ '^[A-Z0-9.\-]+$')
        NOT VALID;

ALTER TABLE waiting_room_patients
    VALIDATE CONSTRAINT chk_patient_id_format;

COMMIT;
