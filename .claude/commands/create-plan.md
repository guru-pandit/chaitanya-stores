# /create-plan

**Agent**: Planner | **Phase**: 1 of 6

## Trigger
Run when a new requirement, bug report, screenshot, or API doc has been provided.

## What happens
Use the planner subagent to produce an implementation plan. No code.

## Steps
1. Read the user's input (problem statement / requirement / error)
2. The planner subagent loads context:
   - `.claude/context/architecture.md`
   - `.claude/context/coding-standards.md`
   - `.claude/context/api-conventions.md`
3. Explore impacted files in the codebase:
   - Relevant `src/app/(site)/`, `src/app/admin/`, `src/app/api/`, `src/components/`, `src/hooks/`, `src/store/`, `src/lib/validations/`, `prisma/schema.prisma`
4. Output all sections defined in `planner.md`:
   - Requirement Summary
   - Scope + Out of scope
   - Files To Change (table)
   - New Files Required (table + justification)
   - Approach (step-by-step, no code)
   - Risks
   - Test Strategy

## Rules
- No code generation under any circumstances
- Flag immediately if the task requires changing: the Prisma schema, admin auth logic, or the public/admin route boundary
- If anything is ambiguous, ask before producing the plan

## Gate
End with: **"Awaiting approval before implementation begins."**
Do not proceed to `/implement` until the user explicitly approves.
