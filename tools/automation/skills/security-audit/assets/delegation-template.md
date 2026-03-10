# Delegation Template: Security Audit

> **Required Skills:** `security-audit`, `refactor-arch`, `testing-qa`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const securitySkill = await read_file("skills/security-audit/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Security] Audit XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Security Audit (OWASP Top 10):
${securitySkill}

## 2. Architecture Refactoring:
${refactorSkill}

## 3. Testing & QA:
${testingSkill}

# Task: [Security audit description]

## Objective:
- Execute audit following OWASP Top 10
- Detect vulnerabilities (XSS, SQL Injection, CSRF, etc.)
- Propose remediation plan with prioritization
- Implement hardening (Helmet, Rate Limiting, Sanitization)

## Constraints:
- Do not break existing tests
- Document each finding with severity (CRITICAL/HIGH/MEDIUM/LOW)
- Tests for malicious cases (>80% coverage in security)
- Follow Conventional Commits

## Deliverables:
1. SECURITY_AUDIT.md with detailed findings
2. Prioritized remediation plan
3. Hardened code (middlewares, guards, sanitizers)
4. Security tests (malicious inputs, edge cases)
5. Updated DEBT_REPORT.md with findings
    `,
});
```

## Real Use Case Example

**User requests:** "Execute security audit on registration endpoints"

**AO executes:**

```javascript
await runSubagent({
  description: "[Security] Audit Registration Endpoints",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: security-audit, refactor-arch, testing-qa

# Task:
Security audit on appointment registration endpoints:
1. Detect OWASP Top 10 vulnerabilities in \`/api/appointments\`
2. Verify input validation (XSS, SQL Injection, NoSQL Injection)
3. Verify rate limiting and CSRF protection
4. Implement sanitization middleware
5. Add schema validation with Joi/Zod
6. Tests for malicious cases (XSS payloads, SQL injection)

# Deliverables:
1. List of detected vulnerabilities (H-XX with severity)
2. Implemented sanitization middleware
3. Schema validation applied
4. 10+ tests for malicious cases
5. Updated DEBT_REPORT.md with findings
    `,
});
```

## Post-Delegation Checklist

- [ ] SA executed audit following OWASP Top 10
- [ ] Findings documented with severity (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Prioritized remediation plan
- [ ] Security hardening implemented
- [ ] Security tests created (>80% coverage)
- [ ] Commits with Conventional Commits
- [ ] SECURITY_AUDIT.md updated
- [ ] DEBT_REPORT.md updated with H-XX findings
