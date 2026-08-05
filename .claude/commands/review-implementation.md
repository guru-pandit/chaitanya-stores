# /review-implementation

**Agents**: Test Engineer → Security Reviewer → Code Reviewer | **Phases**: 3–5 of 6

## Trigger
Run after `/implement` is complete.

## What happens
Three agents run sequentially. Each stops and waits for acknowledgement before the next begins.

---

### Phase 3 — Test Engineer
Use the test-engineer subagent (loads `.claude/context/testing-strategy.md`)

Review the diff and output:
- Test cases (Given/When/Then, user type, automated yes/no)
- Coverage report table (file, current %, target %, gap)
- Gap tests written directly (co-located `*.test.js`)
- Manual QA steps for what cannot be automated

**Stop. Wait for acknowledgement before Phase 4.**

---

### Phase 4 — Security Reviewer
Use the security-reviewer subagent (loads `.claude/context/security-baseline.md`)

Review the diff and output findings table:
| Severity | File : Line | Description | Suggested Fix |
|----------|-------------|-------------|--------------|

Verdict: **PASS** / **PASS WITH NOTES** / **FAIL**

**Stop. If FAIL, implementer must fix before Phase 5.**
**Wait for acknowledgement before Phase 5.**

---

### Phase 5 — Code Reviewer
Use the code-reviewer subagent (loads `.claude/context/coding-standards.md`)

Review the diff and output findings table:
| Severity | File : Line | Description | Suggested Fix |
|----------|-------------|-------------|--------------|

Verdict: **PASS** / **PASS WITH NOTES** / **FAIL**

**Stop. If FAIL, implementer must fix before /ship.**

---

## Gate
All three phases must be PASS or PASS WITH NOTES before `/ship` is run.
Any FAIL requires fixes and a re-run of the failed phase only.
