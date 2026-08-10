# /ship

**Agent**: Documenter (docs) + main conversation (commit) | **Phase**: 6 of 6

## Trigger
Run after `/review-implementation` completes with all phases PASS or PASS WITH NOTES.

## Pre-flight
Confirm before running:
- [ ] Phase 3 (Test Engineer): PASS or PASS WITH NOTES
- [ ] Phase 4 (Security Reviewer): PASS or PASS WITH NOTES
- [ ] Phase 5 (Code Reviewer): PASS or PASS WITH NOTES

If any phase is FAIL — stop and report which phase needs re-review.

## What happens
Use the documenter subagent, in `/ship` mode (conversation output only — no file writes), to produce handoff documentation. Then, back in the main conversation — the documenter subagent has no git/Bash access — stage and create one local commit for the shipped diff, using that documentation as the commit message.

## Steps
1. The documenter subagent loads `.claude/context/architecture.md` — verify new files/routes are consistent
2. Produce all sections from `documenter.md`:
   - **Summary** — 2–3 sentences
   - **Technical Notes** — non-obvious decisions only
   - **API Changes** table (or "No API changes.")
   - **Route Changes** table (or "No route changes.")
   - **Manual QA Steps** — step-by-step for reviewer
   - **Rollback Plan** — files changed + any storage keys added
   - **PR Body** — formatted draft ready to paste into GitHub
3. Run `git status` and `git diff` to see exactly what's part of this shipped change. Stage those files **by name** — never a blind `git add -A`/`-u`. Leave out anything unrelated to this change, any scratch/temp output, and never stage `.env`, `issues.md`, or anything else this repo's `.gitignore`/hard rules exclude. If something staged looks like it could contain a secret, open it and check before committing.
4. Create one commit whose message is derived from the documentation above, not a restatement of the diff:
   - Subject line: concise, imperative, matches this repo's existing style (check `git log --oneline -10` for tone/format)
   - Body: the "why", pulled from the Summary/Technical Notes sections
   - Trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
   - Pass the message via a heredoc, per this project's standard git-commit convention — never `--amend`, never `--no-verify`
5. Report the resulting commit hash and the files it included.

## Rules
- PR body is a **draft** — developer must review and edit before submitting
- Do NOT open a PR or push code — commit locally only; pushing/opening the PR is the developer's call
- Do NOT summarise what each reviewer said — produce clean forward-facing docs
- If the working tree is already clean (nothing to commit), say so and skip straight to the PR body
- If anything looks ambiguous about what belongs in this commit vs. a separate one, stop and ask rather than guessing

## Gate
Workflow complete. A local commit has been created; developer reviews it, copies the PR body, edits as needed, and pushes/opens the PR themselves.
