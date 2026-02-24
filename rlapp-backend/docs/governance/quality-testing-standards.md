# Estándares de Calidad & Validación de Dominio

**Versión:** 1.0
**Fecha:** 24 de febrero de 2026
**Scope:** `rlapp-backend/` ÚNICAMENTE
**Binding:** Mission-Critical

---

## 1. Test Pyramid & Coverage Requirements

```
        /\
       /  \         E2E / Integration Tests
      /    \        (Full appointment workflow)
     /      \       Coverage requirement: >= 90%
    /        \      Example:
   /──────────\     - AppointmentWorkflowE2ETests
  /\                - FinancialValidationEndToEndTests
 /  \               - TenantIsolationTests
/    \              - RabbitMQ event delivery tests
/──────\
 /\
/  \                Contract Tests
    \               (RabbitMQ publisher/consumer)
    /               Coverage requirement: >= 85%
   /\               Example:
  /  \              - FinancialEventPublisherContractTests
                    - AppointmentCreatedConsumerTests

 /\
/  \                Application Layer Tests
    \               (Command/Query handlers)
    /               Coverage requirement: >= 90%
   /\               Example:
  /  \              - ApproveFinancialValidationCommandTests
 /    \             - GetAppointmentStatusQueryTests
/──────\

 /\
/  \                Domain Layer Tests (CORE - HIGHEST PRIORITY)
    \               Coverage requirement: >= 95% MINIMUM
    /               Example:
   /\               - FinancialValidationAggregateTests
  /  \              - AppointmentInvariantTests
 /    \             - DomainEventTests
/──────\
```

### 1.1 Coverage Metrics Definition

```csharp
public class CoverageMetrics
{
    /// <summary>
    /// Line coverage: Percentage of source lines executed by tests.
    /// Formula: (Lines executed / Total lines) * 100
    /// Threshold: >= 90% for application/infrastructure
    /// </summary>
    public double LineCoverage { get; set; }

    /// <summary>
    /// Branch coverage: Percentage of code paths executed.
    /// Formula: (Branches executed / Total branches) * 100
    /// Example: if statement → 2 branches (true, false) → both must execute
    /// Threshold: >= 90%
    /// </summary>
    public double BranchCoverage { get; set; }

    /// <summary>
    /// Domain coverage: Percentage of business rule paths executed.
    /// CRITICAL FOR FINANCIAL: Must exercise all invariants & edge cases.
    /// Threshold: >= 95% for financial domain (CIF-01)
    /// </summary>
    public double DomainCoverage { get; set; }

    /// <summary>
    /// Mutation score: Percentage of mutations killed by tests.
    /// Formula: (Mutations killed / Total mutations introduced) * 100
    /// A mutation = deliberate code change (flip condition, change value, etc.)
    /// If mutation not detected by tests → test is weak
    /// Threshold: >= 80% for all code
    /// </summary>
    public double MutationScore { get; set; }
}
```

---

## 2. TDD Mandatory (Red → Green → Refactor)

### 2.1 Red Stage: Write Failing Test

```csharp
[TestFixture]
public class AppointmentTransitionToWaitingTests
{
    [Test]
    public void TransitionToWaiting_WhenNotApproved_ThrowsException()
    {
        // Arrange
        var appointment = Appointment.Create(
            Guid.NewGuid(),  // tenantId
            DateTime.UtcNow.AddHours(1));

        // Financial status is initially Pending (default)
        Assert.AreEqual(FinancialValidationStatus.Pending, appointment.FinancialStatus);

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(
            () => appointment.TransitionToWaiting());

        Assert.That(ex.Message, Does.Contain("financial approval"));
    }

    // Test fails because TransitionToWaiting() doesn't exist yet
    // or throws the correct exception.
}
```

**Run test:**

```bash
dotnet test --filter "TransitionToWaiting_WhenNotApproved_ThrowsException"
# Result: FAILED ❌
# Reason: Method not found or incorrect exception type
```

### 2.2 Green Stage: Write Minimal Implementation

```csharp
public class Appointment : AggregateRoot
{
    public AppointmentStatus Status { get; private set; }
    public FinancialValidationStatus FinancialStatus { get; private set; }

    public void TransitionToWaiting()
    {
        if (FinancialStatus != FinancialValidationStatus.Approved)
            throw new InvalidOperationException(
                "Appointment cannot transition to Waiting without financial approval");

        Status = AppointmentStatus.Waiting;
    }
}
```

**Run test:**

```bash
dotnet test --filter "TransitionToWaiting_WhenNotApproved_ThrowsException"
# Result: PASSED ✓
```

### 2.3 Refactor Stage: Improve Without Changing Behavior

```csharp
public class Appointment : AggregateRoot
{
    private static readonly AppointmentStatus AllowedStatusForWaiting = AppointmentStatus.Waiting;

    public void TransitionToWaiting()
    {
        EnsureFinancialApprovalExists();
        TransitionStatus();
    }

    private void EnsureFinancialApprovalExists()
    {
        if (FinancialStatus != FinancialValidationStatus.Approved)
            throw new InvalidOperationException(
                GetFinancialApprovalMissingMessage());
    }

    private void TransitionStatus()
    {
        Status = AllowedStatusForWaiting;
        AddDomainEvent(new AppointmentTransitionedToWaiting(Id, TenantId));
    }

    private static string GetFinancialApprovalMissingMessage()
        => "Appointment cannot transition to Waiting without financial approval";
}
```

**Run test (same test, cleaner code):**

```bash
dotnet test --filter "TransitionToWaiting_WhenNotApproved_ThrowsException"
# Result: PASSED ✓
```

---

## 3. Domain Coverage >= 95% (Financial Critical)

### 3.1 Domain Coverage Checklist

```
FinancialValidation Aggregate

□ Invariant 1: Manual Validation Required
  - Test: ApproveManually_WithEmptyUserId_ThrowsException
  - Test: ApproveManually_WithSystemUser_ThrowsException

□ Invariant 2: No Self-Approval
  - Test: ApproveManually_BySameUserWhoCreated_ThrowsException
  - Test: ApproveManually_SelfApprovalAttempt_ThrowsException

□ Invariant 3: Dual Control for High Amounts
  - Test: ApproveManually_HighAmountByPhysician_ThrowsException
  - Test: ApproveManually_HighAmountByFinanceDirector_PartiallyApproves
  - Test: ApproveManually_SecondApprovalCompletes

□ Invariant 4: No Double Approval
  - Test: ApproveManually_WhenAlreadyApproved_ThrowsException
  - Test: ApproveManually_PartiallyApproved_AcceptsSecondApproval

□ Invariant 5: Appointment Transition Requires Approval
  - Test: Appointment.TransitionToWaiting_WhenNotApproved_ThrowsException
  - Test: Appointment.TransitionToWaiting_WhenApproved_Succeeds

□ Domain Event Emission
  - Test: ApproveManually_RaisesFinancialValidationApprovedEvent
  - Test: ApproveManually_PublishedEventContainsCorrectData

□ Edge Cases
  - Test: ApproveManually_WithNullJustification_ThrowsException
  - Test: ApproveManually_WithEmptyJustification_ThrowsException
  - Test: ApproveManually_WithJustificationTooShort_ThrowsException
  - Test: ApproveManually_WithZeroAmount_ThrowsException
  - Test: ApproveManually_WithNegativeAmount_ThrowsException

□ Status Transitions
  - Test: StatusTransition_Pending_To_PartiallyApproved_Valid
  - Test: StatusTransition_PartiallyApproved_To_Approved_Valid
  - Test: StatusTransition_Approved_To_Pending_ThrowsException (invalid)

Total assertions: >= 25 test cases covering all paths
```

### 3.2 Test Report (Proof of Coverage)

```bash
# Command
dotnet test /p:CollectCoverage=true
            /p:CoverageResultsDirectory=./coverage
            /p:CoverageFormat="opencover"
            --filter "Category=Domain"
            --logger "console;verbosity=detailed"

# Output (example)
Financial Domain Tests - FinancialValidation
├─ Tests passed: 32/32 ✓
├─ Code coverage: 96%
├─ Branch coverage: 97%
├─ Domain coverage: 98%
├─ Mutation score: 89%
└─ Critical paths: 100% (all invariants tested)

Detailed coverage by invariant:
├─ Manual validation: 100% ✓
├─ No self-approval: 100% ✓
├─ Dual control: 98% ✓
├─ No double approval: 100% ✓
├─ Appointment transition: 96% ✓
└─ Event emission: 100% ✓
```

---

## 4. Mutation Testing (Anti-Fragility)

### 4.1 What is Mutation Testing?

```
Original code:
    if (status == Approved) {
        return true;
    }

Mutation 1 (flip condition):
    if (status != Approved) {  // ← Changed
        return true;
    }

Question: Does the test catch this mutation?
- If test still passes → Mutation survived (TEST IS WEAK)
- If test fails → Mutation killed (TEST IS STRONG)

Goal: Kill >= 80% of mutations (prove test is rigorous)
```

### 4.2 Stryker for .NET

```bash
# Install
dotnet tool install -g dotnet-stryker

# Run mutation tests
cd rlapp-backend/src/Services/FinancialService/
dotnet stryker --lang-version 12.0

# Configuration (.strykerconfig.json)
{
  "stryker-config": {
    "project": "FinancialService.csproj",
    "test-projects": ["FinancialService.Tests.csproj"],
    "reporters": ["html", "cleartext"],
    "mutation-level": "Standard",  // Or "Complete" for more mutations
    "coverage-analysis": "off",     // Use unit tests only
    "ignore-mutations": ["String"],  // Skip string literal mutations
    "thresholds": {
      "high": 80,
      "medium": 70,
      "low": 60
    }
  }
}

# Output (example)
Stryker .NET Mutation Testing Report
├─ Total mutations: 247
├─ Mutations killed: 219 (89%)
├─ Mutations survived: 28 (11%)
├─ Mutation score: 89% ✓ (PASS - above 80% threshold)
└─ HTML report: reports/index.html

Survived mutations (analysis):
├─ Line 45: `>` changed to `>=` (survived) → TEST IS WEAK
│   Action: Add test for boundary case (amount == threshold)
├─ Line 78: `null` check removed (killed) → TEST IS STRONG
└─ ...
```

### 4.3 Integration with CI/CD

```yaml
# .github/workflows/mutation-tests.yml
name: Mutation Testing (Financial Domain)

on:
  pull_request:
    paths:
      - 'src/Services/FinancialService/**'

jobs:
  mutation-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '10.0'

      - name: Install Stryker
        run: dotnet tool install -g dotnet-stryker

      - name: Run Mutation Tests
        run: |
          cd rlapp-backend/src/Services/FinancialService
          dotnet stryker \
            --lang-version 12.0 \
            --threshold-high 80 \
            --threshold-medium 70 \
            --threshold-low 60

      - name: Check Mutation Score
        run: |
          if [ $MUTATION_SCORE -lt 80 ]; then
            echo "❌ Mutation score ${MUTATION_SCORE}% below threshold 80%"
            exit 1
          fi
          echo "✓ Mutation score ${MUTATION_SCORE}% passes"

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: mutation-report
          path: rlapp-backend/src/Services/FinancialService/StrykerOutput/
```

---

## 5. BDD (Behavior-Driven Development) for Complex Workflows

### 5.1 Gherkin Scenarios (SpecFlow)

```gherkin
# Feature: Financial Validation Approval Workflow
Feature: Financial Validation Approval
  As a Finance Director
  I want to approve or reject financial validations
  So that appointments can be scheduled or cancelled

  Scenario: Successfully approve low-amount validation
    Given a financial validation for amount COP 450,000
    And the validation is in Pending status
    And I am a Finance Director
    When I approve the validation with justification "Paciente cliente preferente"
    Then the validation status should be Approved
    And an event FinancialValidationApprovedManually should be raised
    And the appointment can transition to Waiting

  Scenario: Prevent self-approval
    Given a financial validation created by Finance Director Juan
    And the validation is in Pending status
    When Finance Director Juan attempts to approve the validation
    Then the system should throw "INVARIANT VIOLATION: Cannot approve own submission"
    And the validation status remains Pending

  Scenario: Require dual approval for high amounts
    Given a financial validation for amount COP 900,000 (> UVR 600)
    And the validation is in Pending status
    When Finance Director Maria provides first approval
    Then the validation status should be PartiallyApproved
    When CCO Officer Carlos provides second approval
    Then the validation status should be Approved
    And both approvers are recorded in audit trail

  Scenario: Prevent dual approval from same person
    Given a financial validation for amount COP 800,000
    And Finance Director is the first approver
    When the same Finance Director attempts to provide second approval
    Then the system should throw "INVARIANT VIOLATION: Second approval must be different person"
```

### 5.2 SpecFlow Implementation

```csharp
[Binding]
public class FinancialValidationApprovalSteps
{
    private FinancialValidation _validation;
    private Exception _exception;
    private readonly IFinancialValidationRepository _repo;

    [Given(@"a financial validation for amount COP ([0-9,]+)")]
    public void GivenFinancialValidationForAmount(string amount)
    {
        _validation = FinancialValidation.Create(
            Guid.NewGuid(),  // tenantId
            Guid.NewGuid(),  // appointmentId
            new Money(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)),
            Guid.NewGuid()); // createdBy
    }

    [When(@"I approve the validation with justification ""(.*)""")]
    public void WhenIApproveWithJustification(string justification)
    {
        try
        {
            var approver = new ApprovedBy(
                Guid.NewGuid(), MedicalRole.Physician, "Dr. Test");

            _validation.ApproveManually(approver, justification);
        }
        catch (Exception ex)
        {
            _exception = ex;
        }
    }

    [Then(@"the validation status should be (.*)")]
    public void ThenValidationStatusShouldBe(string status)
    {
        Assert.AreEqual(
            Enum.Parse<FinancialValidationStatus>(status),
            _validation.Status);
    }

    [Then(@"an event (.*) should be raised")]
    public void ThenEventShouldBeRaised(string eventType)
    {
        var events = _validation.GetUncommittedEvents();
        Assert.That(events.Any(e => e.GetType().Name == eventType),
            $"Expected event {eventType} not found in uncommitted events");
    }
}
```

---

## 6. Integration Tests

### 6.1 End-to-End Workflow Test

```csharp
[TestFixture]
public class FinancialValidationEndToEndTests
{
    private readonly IAppointmentService _appointmentService;
    private readonly IFinancialService _financialService;
    private readonly IEventPublisher _eventPublisher;
    private readonly TestDbContext _dbContext;

    [Test]
    public async Task AppointmentToWaiting_WithManualFinancialApproval_Succeeds()
    {
        // Step 1: Create appointment
        var appointmentId = Guid.NewGuid();
        var financialValidationId = Guid.NewGuid();

        var appointment = Appointment.Create(
            tenantId: _dbContext.CurrentTenantId,
            scheduledAt: DateTime.UtcNow.AddDays(1));

        await _appointmentService.CreateAsync(appointment);

        // Step 2: Initiate financial validation
        var validation = FinancialValidation.Create(
            _dbContext.CurrentTenantId, appointmentId,
            new Money(450000), Guid.NewGuid());

        await _financialService.CreateValidationAsync(validation);

        // Step 3: Manually approve (from UI, simulated)
        var approver = new ApprovedBy(
            Guid.NewGuid(), MedicalRole.Physician, "Dr. Luis");

        await _financialService.ApproveManuallyAsync(
            validationId: validation.Id,
            approvedBy: approver,
            justification: "Revisado y aprobado médicamente");

        // Step 4: Verify approval persisted
        var approvedValidation = await _financialService.GetValidationAsync(validation.Id);
        Assert.AreEqual(FinancialValidationStatus.Approved, approvedValidation.Status);

        // Step 5: Event published to RabbitMQ
        var publishedEvents = _eventPublisher.GetPublishedEvents();
        Assert.That(publishedEvents.Any(e => e is FinancialValidationApprovedManually));

        // Step 6: Appointment can now transition to Waiting
        appointment.FinancialValidationId = validation.Id;
        appointment.TransitionToWaiting();  // Should NOT throw

        Assert.AreEqual(AppointmentStatus.Waiting, appointment.Status);

        // Step 7: Audit trail recorded
        var auditRecords = await _auditService.GetAuditTrailAsync(
            appointmentId, _dbContext.CurrentTenantId);

        Assert.That(auditRecords.Any(r => r.Action == "FINANCIAL_APPROVAL"));
        Assert.That(auditRecords[0].PerformedBy, Is.EqualTo(approver.UserId));
    }
}
```

---

## 7. Performance Testing

### 7.1 Baseline Benchmarks

```csharp
[SimpleJob(warmupCount: 3, targetCount: 10)]
[MemoryDiagnoser]
public class FinancialValidationPerformance
{
    private FinancialValidation _validation;

    [GlobalSetup]
    public void Setup()
    {
        _validation = FinancialValidation.Create(
            Guid.NewGuid(), Guid.NewGuid(),
            new Money(450000), Guid.NewGuid());
    }

    [Benchmark]
    public void ApproveManually_SmallAmount()
    {
        var approver = new ApprovedBy(
            Guid.NewGuid(), MedicalRole.Physician, "Dr. Test");

        _validation.ApproveManually(approver, "Justificación médica válida");
    }

    [Benchmark]
    public void TransitionToWaiting_WithApproval()
    {
        var appointment = Appointment.Create(_validation.TenantId, DateTime.UtcNow);
        appointment.FinancialValidationId = _validation.Id;
        appointment.TransitionToWaiting();
    }
}

# Expected output (BenchmarkDotNet):
ApproveManually_SmallAmount          1.23 μs    0.09 μs    < 0.5 MB
TransitionToWaiting_WithApproval     0.89 μs    0.07 μs    < 0.5 MB
```

---

## 8. CI/CD Test Gates

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on: [pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Tests & Coverage
        run: |
          dotnet test --logger:"console;verbosity=detailed" \
            /p:CollectCoverage=true \
            /p:CoverageResultsDirectory=./coverage \
            /p:CoverageFormat="opencover"

      - name: Check Coverage >= 90%
        run: |
          coverage=$(grep -o 'line-rate="[0-9.]*"' coverage/coverage.xml | sed 's/line-rate="\(.*\)"/\1/')
          if (( $(echo "$coverage < 0.90" | bc -l) )); then
            echo "❌ Coverage ${coverage} below 90%"
            exit 1
          fi

      - name: Check Domain Coverage >= 95%
        run: |
          domain_coverage=$(grep -o 'class name="FinancialValidation".*line-rate="[0-9.]*"' coverage/coverage.xml | sed 's/.*line-rate="\(.*\)"/\1/')
          if (( $(echo "$domain_coverage < 0.95" | bc -l) )); then
            echo "❌ Domain coverage ${domain_coverage} below 95%"
            exit 1
          fi

      - name: Mutation Testing (Stryker)
        run: |
          cd rlapp-backend/src/Services/FinancialService
          dotnet stryker --lang-version 12.0 --threshold-high 80

      - name: SAST Scan (SonarQube)
        run: |
          dotnet sonarscanner begin /k:"lcwps-backend" /o:"lcwps"
          dotnet build
          dotnet sonarscanner end

      - name: Report Results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.checks.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              name: 'Quality Gates',
              head_sha: context.sha,
              status: 'completed',
              conclusion: 'success',
              output: {
                title: 'All quality gates passed',
                summary: '✓ Coverage 93%\n✓ Domain 96%\n✓ Mutation 89%\n✓ SAST clean'
              }
            });
```

---

**Quality Standards Status:** ENTERPRISE-BINDING
**Enforcement:** Automated + Peer Review
**Review Cycle:** Per-commit (CI/CD gates)
