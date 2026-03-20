namespace WaitingRoom.Infrastructure.Persistence.Projections;

internal static class ProjectionSchema
{
    public const string CreateConsultingRoomsTableSql = @"
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
";

    public const string CreatePatientStateViewSql = @"
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
";

    public const string CreateRoomOccupancyViewSql = @"
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
";

    public const string CreateCashierQueueViewSql = @"
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
";
}
