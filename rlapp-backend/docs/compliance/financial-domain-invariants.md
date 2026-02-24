# Domain de Validación Financiera Manual (CIF-01)

**Documento:** Financial Domain Invariants & Business Rules
**Versión:** 1.0
**Clasificación:** Mission-Critical
**Owner:** Chief Financial Officer + Chief Architect
**Compliance:** Circular SFC 000031, Ley 1581, Basel III principles

---

## 1. Definición del Agregado: FinancialValidation

### 1.1 Estructura

```csharp
namespace LCWPS.Services.FinancialService.Domain
{
    /// <summary>
    /// FinancialValidation es el agregado central para la aprobación manual de citas.
    /// Encapsula todo el flujo de validación financiera con invariantes de dominio.
    /// </summary>
    public class FinancialValidation : AggregateRoot
    {
        // Identity
        public Guid Id { get; private set; }
        public Guid TenantId { get; private set; }          // Multi-tenant isolation
        public Guid AppointmentId { get; private set; }     // Reference to appointment

        // Status
        public FinancialValidationStatus Status { get; private set; }
        public Money Amount { get; private set; }           // Value object: safe arithmetic
        public FinancialValidationCategory Category { get; private set; }

        // Approval Chain
        public ApprovedBy FirstApprover { get; private set; }
        public DateTime? FirstApprovedAt { get; private set; }
        public ApprovedBy SecondApprover { get; private set; }  // For high amounts
        public DateTime? SecondApprovedAt { get; private set; }

        // Business Context
        public string Justification { get; private set; }
        public bool RequiresSecondApproval { get; private set; }
        public string OverrideReason { get; private set; }
        public bool IsOverride { get; private set; }

        // Audit
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public List<DomainEvent> UncommittedEvents { get; private set; }
    }

    // Value Objects
    public class Money : ValueObject
    {
        public decimal Amount { get; }
        public string Currency { get; }  // COP only for this system

        public Money(decimal amount, string currency = "COP")
        {
            if (amount < 0) throw new InvalidOperationException("Amount must be >= 0");
            Amount = amount;
            Currency = currency;
        }

        public bool IsGreaterThan(Money other) => Amount > other.Amount;
        public bool IsLessThanOrEqualTo(Money other) => Amount <= other.Amount;
    }

    public class ApprovedBy : ValueObject
    {
        public Guid UserId { get; }
        public MedicalRole Role { get; }
        public string Name { get; }

        public ApprovedBy(Guid userId, MedicalRole role, string name)
        {
            UserId = userId;
            Role = role;
            Name = name;
        }
    }

    public enum FinancialValidationStatus
    {
        Pending = 1,
        Approved = 2,
        RejectedByMedical = 3,
        RejectedByFinance = 4,
        PartiallyApproved = 5,  // Waiting for second approval
        Cancelled = 6
    }

    public enum MedicalRole
    {
        Physician = 1,
        FinanceDirector = 2,
        CCO = 3,  // Chief Compliance Officer (override)
        Clerk = 4  // No approval authority
    }
}
```

---

## 2. Invariantes No Negociables

### 2.1 Invariante 1: Validación Manual Obligatoria

**Enunciado:** No existe validación financiera automática. 100% manual.

```csharp
public class FinancialValidation : AggregateRoot
{
    /// <summary>
    /// INVARIANTE: El sistema NUNCA aprueba automáticamente una validación.
    /// Toda aprobación REQUIERE acción manual de usuario autorizado.
    /// </summary>
    public void ApproveManually(ApprovedBy approver, string justification)
    {
        // Prevent auto-approval attempts
        if (approver.UserId == Guid.Empty)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Cannot approve with empty UserId (likely automation attempt)");

        if (Status == FinancialValidationStatus.Approved)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Already approved");

        // Must have explicit justification
        if (string.IsNullOrWhiteSpace(justification) || justification.Length < 10)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Justification required (min 10 chars)");

        // Validate role is authorized
        if (approver.Role == MedicalRole.Clerk)
            throw new UnauthorizedException(
                "INVARIANT VIOLATION: Clerks cannot approve financial validations");

        Status = FinancialValidationStatus.Approved;
        FirstApprover = approver;
        FirstApprovedAt = DateTime.UtcNow;
        Justification = justification;

        // Emit domain event for audit trail
        AddDomainEvent(new FinancialValidationApprovedManually(
            Id, TenantId, AppointmentId, approver, DateTime.UtcNow, Justification));
    }

    // FORBIDDEN METHOD (must not exist)
    // public void AutoApproveIfEligible() { /* CRIME */ }
}
```

---

### 2.2 Invariante 2: Prohibición de Auto-aprobación

**Enunciado:** Un usuario NO PUEDE aprobar su propia validación.

```csharp
public class FinancialValidation : AggregateRoot
{
    private Guid _createdByUserId;

    public void ApproveManually(ApprovedBy approver, string justification)
    {
        // Prevent self-approval
        if (approver.UserId == _createdByUserId)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Cannot approve own financial validation (fraud prevention)");

        // If already approved, prevent second approval from being same person
        if (FirstApprover != null && approver.UserId == FirstApprover.UserId)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Same approver cannot approve twice");

        // ... rest of approval logic
    }
}
```

---

### 2.3 Invariante 3: Aprobación Dual para Montos Altos

**Enunciado:** Montos > UVR 600 requieren 2 aprobaciones (Finance Director + CCO).

```csharp
public class FinancialValidation : AggregateRoot
{
    private static readonly Money HighAmountThreshold = new Money(600 * UVRValue); // ~UVR 600

    public void ApproveManually(ApprovedBy approver, string justification)
    {
        // Determine if dual control required
        if (Amount.IsGreaterThan(HighAmountThreshold))
        {
            RequiresSecondApproval = true;

            // First approval: must be Finance Director
            if (FirstApprover == null && approver.Role != MedicalRole.FinanceDirector)
                throw new InvalidOperationException(
                    "INVARIANT VIOLATION: First approval for >UVR 600 must be Finance Director");

            // Second approval: must be CCO (or DIFFERENT Finance Director)
            if (FirstApprover != null && SecondApprover == null)
            {
                if (approver.Role != MedicalRole.CCO && approver.UserId == FirstApprover.UserId)
                    throw new InvalidOperationException(
                        "INVARIANT VIOLATION: Second approval must be from different person");

                SecondApprover = approver;
                SecondApprovedAt = DateTime.UtcNow;
                Status = FinancialValidationStatus.Approved;

                AddDomainEvent(new DualControlApprovalCompleted(
                    Id, TenantId, AppointmentId, FirstApprover, SecondApprover, DateTime.UtcNow));
            }
            else
            {
                // First approval registered
                FirstApprover = approver;
                FirstApprovedAt = DateTime.UtcNow;
                Status = FinancialValidationStatus.PartiallyApproved;

                AddDomainEvent(new FirstApprovalRegistered(
                    Id, TenantId, AppointmentId, approver, DateTime.UtcNow, Amount));
            }
        }
        else
        {
            // Single approval for <= UVR 600
            if (approver.Role == MedicalRole.Clerk)
                throw new UnauthorizedException("Clerk cannot approve");

            FirstApprover = approver;
            FirstApprovedAt = DateTime.UtcNow;
            Status = FinancialValidationStatus.Approved;
            RequiresSecondApproval = false;

            AddDomainEvent(new FinancialValidationApprovedManually(
                Id, TenantId, AppointmentId, approver, DateTime.UtcNow, Justification));
        }
    }
}
```

---

### 2.4 Invariante 4: Validación = Aprobación de Cita

**Enunciado:** Una cita NO puede transicionar a "En Espera" sin aprobación financiera exitosa.

```csharp
public class Appointment : AggregateRoot
{
    public AppointmentStatus Status { get; private set; }
    public Guid FinancialValidationId { get; private set; }

    /// <summary>
    /// INVARIANTE: Cita no puede pasar a "En Espera" sin validación financiera aprobada.
    /// Esta es la regla de negocio CRITICA para LCWPS.
    /// </summary>
    public void TransitionToWaiting()
    {
        // Must have financial validation
        if (FinancialValidationId == Guid.Empty)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Appointment must have financial validation ID");

        // CRITICAL: Fetch financial validation from repository & verify status
        // (In real code, injected via constructor or repository)
        var financialValidation = _financialRepo.GetById(FinancialValidationId);

        if (financialValidation == null)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Financial validation not found");

        if (financialValidation.Status != FinancialValidationStatus.Approved)
            throw new InvalidOperationException(
                $"INVARIANT VIOLATION: Cannot transition to Waiting. Financial validation status is {financialValidation.Status}");

        // Now safe to transition
        Status = AppointmentStatus.Waiting;

        AddDomainEvent(new AppointmentMovedToWaiting(
            Id, TenantId, FinancialValidationId, DateTime.UtcNow));
    }
}
```

---

### 2.5 Invariante 5: Prevención de Double Approval

**Enunciado:** Una validación aprobada NO puede ser aprobada nuevamente.

```csharp
public class FinancialValidation : AggregateRoot
{
    public void ApproveManually(ApprovedBy approver, string justification)
    {
        // Check if already fully approved
        if (Status == FinancialValidationStatus.Approved && SecondApprover != null)
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Cannot re-approve completed financial validation");

        // If amount is high and first approval exists, don't overwrite
        if (Status == FinancialValidationStatus.PartiallyApproved && Amount.IsGreaterThan(HighAmountThreshold))
        {
            // This is the second approval, proceed
        }
        else if (Status == FinancialValidationStatus.Approved)
        {
            throw new InvalidOperationException(
                "INVARIANT VIOLATION: Already approved");
        }

        // ... rest of approval logic
    }
}
```

---

## 3. Business Rules by Amount

### 3.1 Matriz de Aprobación

```
Amount Range           | Approvers Required | Time Limit | Override Path
─────────────────────────────────────────────────────────────────────────
≤ UVR 100              | Physician          | 2 hours    | N/A
UVR 100 < X ≤ 600      | Finance Director   | 4 hours    | N/A
X > UVR 600            | FD + CCO (dual)    | 8 hours    | CCO only
X > UVR 1000           | CCO override req'd | 24 hours   | Executive sign-off
```

### 3.2 Implementation

```csharp
public class FinancialValidationPolicy
{
    public static (MedicalRole RequiredRole, int SLAMinutes, bool RequiresDual)
        DetermineApprovalRequirements(Money amount)
    {
        // Convert UVR to amount (UVR value varies)
        var uvr100 = new Money(UVRValue * 100);
        var uvr600 = new Money(UVRValue * 600);
        var uvr1000 = new Money(UVRValue * 1000);

        if (amount.IsLessThanOrEqualTo(uvr100))
            return (MedicalRole.Physician, 120, false);      // 2 hours

        if (amount.IsLessThanOrEqualTo(uvr600))
            return (MedicalRole.FinanceDirector, 240, false); // 4 hours

        if (amount.IsLessThanOrEqualTo(uvr1000))
            return (MedicalRole.CCO, 480, true);             // 8 hours + dual

        return (MedicalRole.CCO, 1440, true);                // 24 hours + dual
    }
}

// Use in application layer
public class ApproveFinancialValidationCommandHandler
    : IRequestHandler<ApproveFinancialValidationCommand, Result>
{
    public async Task<Result> Handle(ApproveFinancialValidationCommand request, CancellationToken ct)
    {
        var validation = await _financialRepo.GetById(request.ValidationId, ct);

        // Verify SLA
        var (requiredRole, slaMinutes, requiresDual) =
            FinancialValidationPolicy.DetermineApprovalRequirements(validation.Amount);

        var timeSinceCreation = DateTime.UtcNow - validation.CreatedAt;
        if (timeSinceCreation.TotalMinutes > slaMinutes)
        {
            _logger.LogWarning(
                "Financial validation {id} SLA exceeded: {minutes}m > {slam}m",
                request.ValidationId, timeSinceCreation.TotalMinutes, slaMinutes);

            // Still allow approval, but flag as SLA violation
            validation.Justification += " [SLA_EXCEEDED]";
        }

        validation.ApproveManually(
            new ApprovedBy(request.ApprovedBy, request.UserRole, request.UserName),
            request.Justification);

        await _financialRepo.Save(validation, ct);
        return Result.Success();
    }
}
```

---

## 4. Event Sourcing for Financial Audit Trail

### 4.1 Events Emitted

```csharp
// All are immutable, append-only
public class FinancialValidationCreated : DomainEvent
{
    public Guid ValidationId { get; set; }
    public Guid TenantId { get; set; }
    public Guid AppointmentId { get; set; }
    public Money Amount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class FirstApprovalRegistered : DomainEvent
{
    public Guid ValidationId { get; set; }
    public Guid TenantId { get; set; }
    public ApprovedBy ApprovedBy { get; set; }
    public DateTime ApprovedAt { get; set; }
    public string Justification { get; set; }
}

public class DualControlApprovalCompleted : DomainEvent
{
    public Guid ValidationId { get; set; }
    public Guid TenantId { get; set; }
    public ApprovedBy FirstApprover { get; set; }
    public ApprovedBy SecondApprover { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class FinancialValidationRejected : DomainEvent
{
    public Guid ValidationId { get; set; }
    public Guid TenantId { get; set; }
    public string RejectionReason { get; set; }
    public ApprovedBy RejectedBy { get; set; }
}
```

### 4.2 Persistence (Event Store + Audit Log)

```sql
-- Event Store (immutable, ordered)
INSERT INTO event_store
    (aggregate_id, aggregate_type, event_type, event_payload,
     event_version, occurred_at, correlation_id)
VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'FinancialValidation',
     'FirstApprovalRegistered',
     '{...json payload...}',
     1, '2026-02-24 10:15:00', '550e8400-e29b-41d4-a716-446655440999');

-- Audit Log (for compliance reporting)
INSERT INTO financial_audit_log
    (appointment_id, action, performed_by, performed_at, amount, justification, tenant_id)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000',
     'APPROVED',
     '550e8400-e29b-41d4-a716-446655440002',  -- Médico
     '2026-02-24 10:15:00',
     450000.00,  -- COP
     'Paciente es cliente preferente, monto justificado por urgencia médica',
     '550e8400-e29b-41d4-a716-446655440100');  -- Tenant ID
```

---

## 5. Query Tests (Domain Coverage ≥ 95%)

### 5.1 Test Suite

```csharp
[TestFixture]
public class FinancialValidationInvariantTests
{
    private FinancialValidation _validation;
    private Guid _tenantId;
    private Guid _appointmentId;

    [SetUp]
    public void Setup()
    {
        _tenantId = Guid.NewGuid();
        _appointmentId = Guid.NewGuid();
        _validation = FinancialValidation.Create(
            _tenantId, _appointmentId, new Money(150000), Guid.NewGuid());
    }

    // Invariant 1: Manual validation
    [Test]
    public void ApproveManually_WithAutoApprovalAttempt_ThrowsException()
    {
        Assert.Throws<InvalidOperationException>(
            () => _validation.ApproveManually(
                new ApprovedBy(Guid.Empty, MedicalRole.Physician, "System"),  // Empty = automation
                "Auto-approved"));
    }

    // Invariant 2: No self-approval
    [Test]
    public void ApproveManually_BySameUserWhoCreated_ThrowsException()
    {
        var creator = Guid.NewGuid();
        _validation._createdByUserId = creator;

        Assert.Throws<InvalidOperationException>(
            () => _validation.ApproveManually(
                new ApprovedBy(creator, MedicalRole.Physician, "Dr. Juan"),
                "Autorizado"));
    }

    // Invariant 3: Dual control for high amounts
    [Test]
    public void ApproveManually_HighAmountByNonFinanceDirector_ThrowsException()
    {
        var validation = FinancialValidation.Create(
            _tenantId, _appointmentId, new Money(700 * UVRValue), Guid.NewGuid());

        Assert.Throws<InvalidOperationException>(
            () => validation.ApproveManually(
                new ApprovedBy(Guid.NewGuid(), MedicalRole.Physician, "Dr. Maria"),
                "Cita urgente"));
    }

    [Test]
    public void ApproveManually_HighAmountWithDualControl_SucceedsAfterBothApprovals()
    {
        var validation = FinancialValidation.Create(
            _tenantId, _appointmentId, new Money(700 * UVRValue), Guid.NewGuid());

        var fd = new ApprovedBy(Guid.NewGuid(), MedicalRole.FinanceDirector, "Dir. Finance");
        var cco = new ApprovedBy(Guid.NewGuid(), MedicalRole.CCO, "CCO");

        // First approval
        validation.ApproveManually(fd, "Monto revisado, aprobado");
        Assert.AreEqual(FinancialValidationStatus.PartiallyApproved, validation.Status);

        // Second approval
        validation.ApproveManually(cco, "Confirmed compliance");
        Assert.AreEqual(FinancialValidationStatus.Approved, validation.Status);
        Assert.AreEqual(fd.UserId, validation.FirstApprover.UserId);
        Assert.AreEqual(cco.UserId, validation.SecondApprover.UserId);
    }

    // Invariant 4: No double approval
    [Test]
    public void ApproveManually_WhenAlreadyApproved_ThrowsException()
    {
        _validation.ApproveManually(
            new ApprovedBy(Guid.NewGuid(), MedicalRole.Physician, "Dr. Carlos"),
            "Autorizado");

        Assert.Throws<InvalidOperationException>(
            () => _validation.ApproveManually(
                new ApprovedBy(Guid.NewGuid(), MedicalRole.Physician, "Dr. Ana"),
                "Re-autorizado"),
            "Cannot re-approve");
    }

    // Invariant 5: Event is raised
    [Test]
    public void ApproveManually_RaisesDomainEvent()
    {
        var approver = new ApprovedBy(Guid.NewGuid(), MedicalRole.Physician, "Dr. Pablo");

        _validation.ApproveManually(approver, "Justificación médica válida");

        var events = _validation.GetUncommittedEvents();
        Assert.AreEqual(1, events.Count());
        Assert.IsInstanceOf<FinancialValidationApprovedManually>(events.First());
    }
}
```

---

## 6. Compliance Evidence

### 6.1 Audit Trail Output

```
Financial Validation: 550e8400-e29b-41d4-a716-446655440000
├─ Created: 2026-02-24 09:00:00 by System
├─ Appointment: 550e8400-e29b-41d4-a716-446655440001
├─ Tenant: Clínica Salud Integral
├─ Amount: COP 450,000.00
├─ Status progression:
│   ├─ Pending (2026-02-24 09:00:00)
│   └─ Approved (2026-02-24 10:15:00)
├─ Approvals:
│   └─ Dr. Juan Pérez (Physician)
│       Approval time: 2026-02-24 10:15:00
│       Justification: "Paciente es cliente preferente, monto justificado por urgencia médica"
│       IP: 203.0.113.42
│       User-Agent: Mozilla/5.0...
└─ Fingerprint: a3c5f7d9e1b2c6a8f0d3e5c7a9b1d3f5 (SHA-256 hash)
```

---

**Document Status:** ENTERPRISE-BINDING
**Financial Domain Coverage Requirement:** ≥ 95% (MANDATORY)
**Review Cycle:** Annually or after regulatory changes
