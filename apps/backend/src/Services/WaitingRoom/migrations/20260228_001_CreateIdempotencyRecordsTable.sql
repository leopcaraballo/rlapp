-- Migration: 20260228_001_CreateIdempotencyRecordsTable.sql
-- Purpose: Add persistent idempotency storage for true request deduplication
-- Author: Principal Backend Architect - Clinical Systems
-- Date: 2026-02-28
--
-- CLINICAL CONTEXT:
-- Patient check-in must be idempotent. Network failures should not result in
-- duplicate patients in the system. This migration creates the infrastructure
-- to guarantee idempotence across application restarts and concurrent requests.

BEGIN TRANSACTION;

-- Create idempotency records table
CREATE TABLE IF NOT EXISTS waiting_room_idempotency_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_payload TEXT NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Unique index on idempotency_key
-- Enforces request deduplication while records exist.
-- Key reuse after TTL is enabled by deleting expired rows.
CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_idempotency_key
    ON waiting_room_idempotency_records (idempotency_key);

-- Index for TTL cleanup queries
CREATE INDEX IF NOT EXISTS ix_waiting_room_idempotency_expires
    ON waiting_room_idempotency_records (expires_at);

-- Grant permissions (adjust for actual schema ownership)
-- GRANT SELECT, INSERT ON waiting_room_idempotency_records TO rlapp_user;

COMMIT;
