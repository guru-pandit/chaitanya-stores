# /docs

**Agent**: Documenter | **Phase**: on demand

## Trigger
Run any time documentation is stale — after a feature ships, after `/ship`, or whenever explicitly requested.

## What happens
Use the documenter subagent, in `/docs` mode (this mode DOES write/edit files, unlike `/ship`).

## Steps
1. The documenter subagent loads `.claude/context/architecture.md` to check what's currently documented vs what exists in code
2. Review the codebase for what's out of date:
   - `README.md` — setup steps, scripts, env vars, tech stack
   - JSDoc on exported functions in `src/lib/`, `src/hooks/`, `src/lib/validations/`
   - `.claude/context/architecture.md` — if routes, schema, or key paths changed
   - `CHANGELOG.md` — add an entry for the most recent shipped change (create the file if it doesn't exist)
3. Update or create each file that's out of date. Do not touch files that are already accurate.
4. Do not invent behavior that isn't in the code — mark unclear areas as `TODO` for a human instead of guessing.

## Output format
### Files Updated
| File | What changed |
|------|--------------|

### Files Created
| File | Purpose |
|------|---------|

### Flagged (needs human input)
Anything left as a `TODO` because the code's intent was ambiguous.

## Rules
- Never invent API behavior, routes, or config that don't exist in the code
- Never remove documentation for something that still exists just because it wasn't mentioned in the recent diff
- Keep language plain and concrete — no marketing language, no filler

## Gate
None — this command is safe to run standalone at any time.
