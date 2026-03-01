-- Migration: 20260301_001_AlterIdempotencyResponsePayloadToText.sql
-- Purpose: Preserve byte-exact idempotent responses by storing payload as TEXT
-- Context: JSONB rewrites property order/spacing and breaks strict replay equality

BEGIN;

ALTER TABLE IF EXISTS waiting_room_idempotency_records
    ALTER COLUMN response_payload TYPE TEXT
    USING response_payload::text;

COMMIT;
