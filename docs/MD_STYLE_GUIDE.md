# Markdown Style Guide

> Standard for all `.md` files in this project. Reduces visual noise and ensures consistency.

## 1. Titles

- **H1:** One per file. Sentence case, no emoji, no ALL-CAPS.
  - Good: `# Debt report`
  - Bad: `# 📋 REPORTE DE DEUDA TÉCNICA`
- **H2–H4:** Sentence case. No emoji prefixes.
  - Good: `## 1. Architecture overview`
  - Bad: `## 🏗️ Architecture Overview`

## 2. Headings and numbering

| Level | Numbering           | Example                       |
| ----- | ------------------- | ----------------------------- |
| H2    | `## 1.` `## 2.`     | `## 1. Context`               |
| H3    | `### 1.1` `### 1.2` | `### 1.1 Producer service`    |
| H4    | Unnumbered          | `#### Implementation details` |

- Use dot-style numbering only (`1.`, `1.1`). No parenthetical (`1)`), no ID-prefixed (`S-01`).
- Exception: Finding/issue IDs may appear after the heading text: `### 1.1 Missing coverage (R-14)`.

## 3. Emoji policy

- **Forbidden in:** Titles (H1–H4), table cells, bullet lists.
- **Allowed only in:** Inline status within prose when strictly necessary (max 1 per paragraph).
- **Status columns in tables:** Use text labels instead of emoji.

| Instead of | Use                           |
| ---------- | ----------------------------- |
| ✅         | `Done`                        |
| ⬜         | `Pending`                     |
| 🔄         | `In progress`                 |
| ⏸️         | `Paused`                      |
| 🔴         | `Critical`                    |
| 🟡         | `Warning`                     |
| ⛔         | `Do not` (or `Anti-pattern:`) |

## 4. Horizontal rules

- Use `---` **only** to separate the document header (title + summary) from the body.
- Do **not** place `---` between every section — headings already provide visual separation.
- Maximum: 1 horizontal rule per file (after title/summary block).

## 5. Blockquotes

- Use `>` for short context notes or callouts (1–3 lines max).
- Do **not** wrap entire file bodies in blockquotes.
- Format:
  ```
  > Brief context or important note about this section.
  ```

## 6. Tables

- Keep columns under 60 characters. If content is longer, move it to a sub-section.
- Use left-alignment (`:---`) or default. Avoid centered (`:---:`) unless data is numeric.
- No emoji in cells — use text labels (see section 3).
- No HTML (`<br>`) inside cells. Split into multiple rows instead.

## 7. Code blocks

- Always specify a language tag: ` ```typescript `, ` ```sh `, ` ```plaintext `.
- Use `plaintext` for directory trees and non-code content.
- Keep blocks under 40 lines. For longer code, split into logical parts with explanatory prose between them.

## 8. Status indicators

Use a single, consistent vocabulary across all files:

| Status      | Label         |
| ----------- | ------------- |
| Completed   | `Done`        |
| Not started | `Pending`     |
| In progress | `In progress` |
| Paused      | `Paused`      |
| Blocked     | `Blocked`     |

For severity in audit/security reports:

| Severity | Label      |
| -------- | ---------- |
| Critical | `CRITICAL` |
| High     | `HIGH`     |
| Medium   | `MEDIUM`   |
| Low      | `LOW`      |
| Info     | `INFO`     |

## 9. Language

- Each file must be in **one language only** (Spanish or English).
- Do not mix languages within the same file.
- Technical terms (e.g., "middleware", "repository") may remain in English within Spanish files.

## 10. File structure template

```markdown
# Document title

> One-line summary of purpose.

---

## 1. First section

Content here.

### 1.1 Subsection

Details here.

## 2. Second section

Content here.
```

## 11. Checklist for authors

- [ ] H1 is sentence case, no emoji, no ALL-CAPS
- [ ] No emoji in headings, tables, or bullet lists
- [ ] Single language throughout the file
- [ ] At most one `---` (after the header block)
- [ ] Tables have columns under 60 chars
- [ ] Code blocks have language tags
- [ ] Status labels use the standard vocabulary (text, not emoji)
