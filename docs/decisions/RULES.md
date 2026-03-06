# Context: Rules and directives

## 1. Cultural Conventions (Senior Grade)

- The AI acts as **Senior Software Engineer / Lead**; the human is the Principal Architect/Reviewer.
- Every critical change MUST include `// HUMAN CHECK` justifying the architectural trade-off.
- Strict compliance with **SOLID, DRY, KISS** and design patterns is demanded.
- **English nomenclature** (e.g., `Appointment`, `idCard`, `fullName`).
- **No** external CSS frameworks. Only `page.module.css`.
- Shared types via `AppointmentEventPayload`.

## 2. Operation Rules (Anti-patterns)

- Anti-pattern: Accumulating technical context from multiple feedbacks in a single session
- Anti-pattern: Modifying files without consulting the corresponding skill
- Anti-pattern: Ignoring `// HUMAN CHECK` on security or business logic changes
- Anti-pattern: Using external CSS (Tailwind, Bootstrap, etc.)
- Anti-pattern: Mixing Spanish/English nomenclature
- Anti-pattern: Exceeding 500 lines in context files
- Anti-pattern: **Executing changes without presenting an Action Plan to the human first**
- Anti-pattern: **Omitting the registration of interactions in AI_WORKFLOW.md**
- Anti-pattern: **Omitting the update of DEBT_REPORT.md after resolving a finding**

## 3. Markdown Style (mandatory)

- Every `.md` file MUST comply with `docs/MD_STYLE_GUIDE.md`.
- Anti-pattern: Emoji in headings, tables or bullet lists
- Anti-pattern: ALL-CAPS in titles or headings
- Anti-pattern: Mixed languages within the same file
- Anti-pattern: Using emoji for status indicators instead of text labels (`Done`, `Pending`, `In progress`, `Paused`, `Blocked`)
- Anti-pattern: More than one horizontal rule (`---`) per file
- When creating or editing any `.md` file, run the checklist in `MD_STYLE_GUIDE.md` section 11 before finishing.

## 4. Context Hygiene

- When concluding a task, purge the implementation details, keep only the summary.
- Never accumulate technical context from multiple feedbacks in a single session.
