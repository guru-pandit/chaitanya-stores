# /implement

**Agent**: Implementer | **Phase**: 2 of 6

## Trigger
Run after `/create-plan` has been explicitly approved by the developer.

## What happens
Use the implementer subagent to write production-ready code.

## Steps
1. Pass the approved plan from the conversation to the subagent
2. The implementer subagent loads context:
   - `.claude/context/architecture.md`
   - `.claude/context/coding-standards.md`
   - `.claude/context/react-patterns.md`
   - `.claude/context/api-conventions.md`
3. Run pre-flight checklist from `implementer.md` before writing any file
4. Implement only what the plan specifies — no scope creep
5. Apply all changes using Edit/Write tools
6. Output:
   - **Files Modified** table
   - **Summary** (3–5 bullets)

## Hard rules
- Do NOT change the Prisma schema, admin auth logic, or the public/admin route boundary unless plan explicitly approves
- Do NOT add packages — propose in planning
- Do NOT refactor outside task scope
- Public pages stay Server Components with direct Prisma reads; admin CRUD goes through React Query hooks + API routes
- Zod schema first, type via `z.infer` — reused by both the form and the API route
- Contact details from `src/lib/site-config.ts` — never hardcoded
- New admin page: place under `src/app/admin/(protected)/`, gated by `auth()`

## Gate
End with: **"Implementation complete. Run /review-implementation to begin review."**
