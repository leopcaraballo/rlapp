-- =============================================================================
-- RLAPP PostgreSQL Schema Initialization
-- Event Store, Outbox, and Read Models
-- =============================================================================

-- Create databases
CREATE DATABASE rlapp_waitingroom;
CREATE DATABASE rlapp_waitingroom_read;
CREATE DATABASE rlapp_waitingroom_test;

-- Connect to eventstore database
\c rlapp_waitingroom

-- =============================================================================
-- EVENT STORE SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_events (
    event_id UUID PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    version BIGINT NOT NULL,
    event_name TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    schema_version INT NOT NULL,
    payload JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_events_aggregate_version
    ON waiting_room_events (aggregate_id, version);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_events_idempotency
    ON waiting_room_events (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_waiting_room_events_aggregate_type
    ON waiting_room_events (aggregate_type);

-- =============================================================================
-- OUTBOX PATTERN TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_outbox (
    outbox_id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    event_name TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,
    attempts INT NOT NULL,
    next_attempt_at TIMESTAMPTZ NULL,
    last_error TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_outbox_event
    ON waiting_room_outbox (event_id);

CREATE INDEX IF NOT EXISTS ix_waiting_room_outbox_pending
    ON waiting_room_outbox (status, next_attempt_at);

-- =============================================================================
-- PATIENT IDENTITY REGISTRY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_patients (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL
);

-- Uniqueness scoped per day: same person can register again on a different day
CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_patients_identity_date
    ON waiting_room_patients (patient_identity, registration_date);

-- =============================================================================
-- LAG MONITORING TABLE (Observability)
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_processing_lag (
    event_id UUID PRIMARY KEY,
    event_name TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_created_at TIMESTAMPTZ NOT NULL,
    event_published_at TIMESTAMPTZ,
    projection_processed_at TIMESTAMPTZ,
    outbox_dispatch_duration_ms INT,
    projection_processing_duration_ms INT,
    total_lag_ms INT,
    status TEXT NOT NULL, -- CREATED, PUBLISHED, PROCESSED, FAILED
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_name_lag ON event_processing_lag(event_name);
CREATE INDEX IF NOT EXISTS idx_status_lag ON event_processing_lag(status);
CREATE INDEX IF NOT EXISTS idx_created_at_lag ON event_processing_lag(created_at);

-- =============================================================================
-- IDEMPOTENCY / REQUEST DEDUPLICATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_idempotency_records (
    idempotency_key TEXT PRIMARY KEY,
    request_hash TEXT NOT NULL,
    response_payload JSONB NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_idempotency_expiry ON waiting_room_idempotency_records (expires_at);

-- =============================================================================
-- PROJECTION STATE (for rebuild capability)
-- =============================================================================

CREATE TABLE IF NOT EXISTS projection_checkpoints (
    projection_id TEXT PRIMARY KEY,
    last_event_version BIGINT NOT NULL DEFAULT 0,
    checkpointed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key TEXT NOT NULL,
    status TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_projection_checkpoints_idempotency
    ON projection_checkpoints (idempotency_key);

-- =============================================================================
-- PATIENT-CENTRIC READ MODELS (created by DatabaseInitializer at startup,
-- also included here for docker bootstrap consistency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS consulting_rooms (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_consulting_rooms_is_active
    ON consulting_rooms (is_active);

CREATE TABLE IF NOT EXISTS patients_state_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL UNIQUE,
    patient_name VARCHAR(255) NOT NULL,
    current_state VARCHAR(50) NOT NULL,
    waiting_started_at TIMESTAMPTZ,
    assigned_room_id TEXT,
    consultation_started_at TIMESTAMPTZ,
    consultation_finished_at TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    payment_attempts INT DEFAULT 0,
    payment_validated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    leave_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    last_modified_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_identity
    ON patients_state_view (patient_identity);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_current_state
    ON patients_state_view (current_state);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_assigned_room
    ON patients_state_view (assigned_room_id);

CREATE TABLE IF NOT EXISTS consulting_room_occupancy_view (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    current_patient_id TEXT,
    patient_name VARCHAR(255),
    attention_started_at TIMESTAMPTZ,
    attention_duration_seconds INT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_room_occupancy_is_active
    ON consulting_room_occupancy_view (is_active);

CREATE TABLE IF NOT EXISTS cashier_queue_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    arrived_at_cashier_at TIMESTAMPTZ NOT NULL,
    payment_attempts INT DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_cashier_queue_arrived
    ON cashier_queue_view (arrived_at_cashier_at);

-- Connect to test database
\c rlapp_waitingroom_test

-- =============================================================================
-- EVENT STORE SCHEMA (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_events (
    event_id UUID PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,         -- 'Patient' or 'ConsultingRoom'
    version BIGINT NOT NULL,
    event_name TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    schema_version INT NOT NULL,
    payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_waiting_room_events_aggregate_type_test
    ON waiting_room_events (aggregate_type);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_events_aggregate_version
    ON waiting_room_events (aggregate_id, version);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_events_idempotency
    ON waiting_room_events (idempotency_key);

-- =============================================================================
-- OUTBOX PATTERN TABLE (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_outbox (
    outbox_id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    event_name TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,
    attempts INT NOT NULL,
    next_attempt_at TIMESTAMPTZ NULL,
    last_error TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_outbox_event
    ON waiting_room_outbox (event_id);

CREATE INDEX IF NOT EXISTS ix_waiting_room_outbox_pending
    ON waiting_room_outbox (status, next_attempt_at);

-- =============================================================================
-- PATIENT IDENTITY REGISTRY TABLE (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_patients (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL
);

-- Uniqueness scoped per day: same person can register again on a different day
CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_patients_identity_date_test
    ON waiting_room_patients (patient_identity, registration_date);

-- =============================================================================
-- LAG MONITORING TABLE (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_processing_lag (
    event_id UUID PRIMARY KEY,
    event_name TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_created_at TIMESTAMPTZ NOT NULL,
    event_published_at TIMESTAMPTZ,
    projection_processed_at TIMESTAMPTZ,
    outbox_dispatch_duration_ms INT,
    projection_processing_duration_ms INT,
    total_lag_ms INT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_name_lag ON event_processing_lag(event_name);
CREATE INDEX IF NOT EXISTS idx_status_lag ON event_processing_lag(status);
CREATE INDEX IF NOT EXISTS idx_created_at_lag ON event_processing_lag(created_at);

-- =============================================================================
-- PROJECTION STATE (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS projection_checkpoints (
    projection_id TEXT PRIMARY KEY,
    last_event_version BIGINT NOT NULL DEFAULT 0,
    checkpointed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key TEXT NOT NULL,
    status TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_projection_checkpoints_idempotency
    ON projection_checkpoints (idempotency_key);

-- =============================================================================
-- IDEMPOTENCY RECORDS TABLE (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS waiting_room_idempotency_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_payload TEXT NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_waiting_room_idempotency_key_test
    ON waiting_room_idempotency_records (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_waiting_room_idempotency_expires_test
    ON waiting_room_idempotency_records (expires_at);

-- =============================================================================
-- PATIENT-CENTRIC READ MODELS (TEST)
-- =============================================================================

CREATE TABLE IF NOT EXISTS consulting_rooms (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_consulting_rooms_is_active_test
    ON consulting_rooms (is_active);

CREATE TABLE IF NOT EXISTS patients_state_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL UNIQUE,
    patient_name VARCHAR(255) NOT NULL,
    current_state VARCHAR(50) NOT NULL,
    waiting_started_at TIMESTAMPTZ,
    assigned_room_id TEXT,
    consultation_started_at TIMESTAMPTZ,
    consultation_finished_at TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    payment_attempts INT DEFAULT 0,
    payment_validated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    leave_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    last_modified_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_state_view_current_state_test
    ON patients_state_view (current_state);

CREATE TABLE IF NOT EXISTS consulting_room_occupancy_view (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    current_patient_id TEXT,
    patient_name VARCHAR(255),
    attention_started_at TIMESTAMPTZ,
    attention_duration_seconds INT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS cashier_queue_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    arrived_at_cashier_at TIMESTAMPTZ NOT NULL,
    payment_attempts INT DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

-- Connect to read_models database
\c rlapp_waitingroom_read

-- =============================================================================
-- PATIENT-CENTRIC READ MODELS / PROJECTIONS
-- (Replaces legacy waiting_queue_view and waiting_patients_view)
-- =============================================================================

-- Consulting Rooms reference table (managed by Admin)
CREATE TABLE IF NOT EXISTS consulting_rooms (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_consulting_rooms_is_active_read
    ON consulting_rooms (is_active);

-- Patient state projection: one row per patient with full lifecycle state
CREATE TABLE IF NOT EXISTS patients_state_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL UNIQUE,
    patient_name VARCHAR(255) NOT NULL,
    current_state VARCHAR(50) NOT NULL,
    waiting_started_at TIMESTAMPTZ,
    assigned_room_id TEXT,
    consultation_started_at TIMESTAMPTZ,
    consultation_finished_at TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    payment_attempts INT DEFAULT 0,
    payment_validated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    leave_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    last_modified_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_state_current_state_read
    ON patients_state_view (current_state);

CREATE INDEX IF NOT EXISTS idx_patients_state_assigned_room_read
    ON patients_state_view (assigned_room_id);

-- Consulting room occupancy projection: live occupancy per room
CREATE TABLE IF NOT EXISTS consulting_room_occupancy_view (
    room_id TEXT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    current_patient_id TEXT,
    patient_name VARCHAR(255),
    attention_started_at TIMESTAMPTZ,
    attention_duration_seconds INT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_room_occupancy_is_active_read
    ON consulting_room_occupancy_view (is_active, current_patient_id);

-- Cashier queue projection: patients currently at-cashier ordered by arrival
CREATE TABLE IF NOT EXISTS cashier_queue_view (
    patient_id TEXT PRIMARY KEY,
    patient_identity TEXT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    arrived_at_cashier_at TIMESTAMPTZ NOT NULL,
    payment_attempts INT DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_event_version BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_cashier_queue_arrived_read
    ON cashier_queue_view (arrived_at_cashier_at);

-- Aggregate lag metrics view (monitoring)
CREATE TABLE IF NOT EXISTS event_lag_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_name VARCHAR(255) NOT NULL,
    events_created_count INT NOT NULL DEFAULT 0,
    events_published_count INT NOT NULL DEFAULT 0,
    events_processed_count INT NOT NULL DEFAULT 0,
    average_lag_ms DECIMAL(10,2),
    max_lag_ms INT,
    min_lag_ms INT,
    p95_lag_ms INT,
    p99_lag_ms INT
);

CREATE INDEX IF NOT EXISTS idx_metric_timestamp ON event_lag_metrics(metric_timestamp);
CREATE INDEX IF NOT EXISTS idx_event_name_metrics ON event_lag_metrics(event_name);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT ALL PRIVILEGES ON DATABASE rlapp_waitingroom TO rlapp;
GRANT ALL PRIVILEGES ON DATABASE rlapp_waitingroom_read TO rlapp;
GRANT ALL PRIVILEGES ON DATABASE rlapp_waitingroom_test TO rlapp;

\c rlapp_waitingroom
GRANT ALL PRIVILEGES ON SCHEMA public TO rlapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rlapp;

\c rlapp_waitingroom_test
GRANT ALL PRIVILEGES ON SCHEMA public TO rlapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rlapp;

\c rlapp_waitingroom_read
GRANT ALL PRIVILEGES ON SCHEMA public TO rlapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rlapp;
