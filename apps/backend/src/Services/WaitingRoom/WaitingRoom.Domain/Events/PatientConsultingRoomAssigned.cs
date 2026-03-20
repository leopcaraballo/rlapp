namespace WaitingRoom.Domain.Events;

using BuildingBlocks.EventSourcing;

/// <summary>
/// Domain event: Receptionist assigns a consulting room to the patient.
/// </summary>
public sealed record PatientConsultingRoomAssigned : DomainEvent
{
    public required string PatientId { get; init; }
    public required string ConsultingRoomId { get; init; }
    public required DateTime AssignedAt { get; init; }

    public override string EventName => "PatientConsultingRoomAssigned";

    protected override void ValidateInvariants()
    {
        base.ValidateInvariants();
        if (string.IsNullOrWhiteSpace(PatientId)) throw new InvalidOperationException("PatientId is required");
        if (string.IsNullOrWhiteSpace(ConsultingRoomId)) throw new InvalidOperationException("ConsultingRoomId is required");
    }
}
