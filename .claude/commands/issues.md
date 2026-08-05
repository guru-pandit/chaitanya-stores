# /issues

**Agent**: none (main conversation compiles) | **Phase**: on demand — after `/review-implementation` and/or `/e2e-qa`

## Trigger
Run after any combination of `/review-implementation` (test-engineer / security-reviewer / code-reviewer) and `/e2e-qa` has produced findings you want tracked, rather than just left in the conversation.

## What happens
Compile every distinct finding from the most recent runs in this session into `issues.md` at the repo root.

## Steps
1. Gather findings from whichever of these ran most recently in this session:
   - Test Engineer coverage gaps / missing scenarios
   - Security Reviewer findings table
   - Code Reviewer findings table
   - E2E QA "Failures Found" and "Not Verified" sections
2. De-duplicate — if the same root cause was flagged by more than one agent, merge into a single entry and note all sources
3. Write or append to `issues.md` using this format per entry:

```
## [severity: critical/high/medium/low] Short title
- **Where:** file/path or user-facing flow
- **Found by:** code-reviewer / security-reviewer / test-engineer / e2e-qa
- **What:** description of the problem
- **Suggested fix:** (optional, one line)
- **Status:** open
```

4. Group entries by severity, critical first. Severity mapping:
   - Security Reviewer Critical/High → critical/high
   - Code Reviewer Major → high; Minor → medium; Suggestion → low
   - E2E QA Fail → high (unless it blocks a core enquiry/auth flow, then critical); Not Verified → medium
5. If `issues.md` already exists, append new entries rather than overwriting. For entries that match something already marked `open` in the file, check whether recent code changes resolved it — if so mark `Status: resolved` instead of duplicating.

## Rules
- Never soften or drop a Security Reviewer Critical/High finding
- Never invent an issue that wasn't actually reported by one of the agents above
- This command does not fix anything — it only records

## Gate
None — safe to run any time review or QA output exists in the session.
