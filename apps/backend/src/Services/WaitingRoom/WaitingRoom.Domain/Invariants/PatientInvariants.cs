namespace WaitingRoom.Domain.Invariants;

using Exceptions;
using ValueObjects;
using Aggregates;

/// <summary>
/// Business invariants for the Patient aggregate.
/// </summary>
public static class PatientInvariants
{
    public static void ValidatePatientIdentity(PatientIdentity identity)
    {
        if (identity == null) throw new DomainException("Patient identity is required");
    }

    public static void ValidatePatientName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("Patient name is required");
        if (name.Length < 2) throw new DomainException("Patient name is too short");
    }

    public static void ValidateStateTransition(PatientState current, PatientState target)
    {
        bool isValid = (current, target) switch
        {
            (PatientState.Unknown, PatientState.Registered) => true,
            (PatientState.Registered, PatientState.Waiting) => true,
            (PatientState.Waiting, PatientState.Assigned) => true,
            (PatientState.Assigned, PatientState.InConsultation) => true,
            (PatientState.InConsultation, PatientState.FinishedConsultation) => true,
            (PatientState.FinishedConsultation, PatientState.AtCashier) => true,
            (PatientState.AtCashier, PatientState.PaymentValidated) => true,
            (PatientState.PaymentValidated, PatientState.Completed) => true,
            
            // Terminal states from various points
            (PatientState.Assigned, PatientState.AbsentAtConsultation) => true,
            (PatientState.InConsultation, PatientState.AbsentAtConsultation) => true,
            (PatientState.AtCashier, PatientState.AbsentAtCashier) => true,
            (PatientState.AtCashier, PatientState.CancelledByPayment) => true,
            
            _ => false
        };

        if (!isValid)
            throw new DomainException($"Invalid patient state transition from {current} to {target}");
    }

    public static void ValidateStateTransitionToTerminal(PatientState current, PatientState target)
    {
        // Similar to above but specifically for terminal states if needed
        ValidateStateTransition(current, target);
    }

    public static void ValidateConsultingRoomId(string? roomId)
    {
        if (string.IsNullOrWhiteSpace(roomId)) throw new DomainException("Consulting room ID is required");
    }

    public static void ValidatePaymentAmount(decimal amount)
    {
        if (amount <= 0) throw new DomainException("Payment amount must be greater than 0");
    }
}
