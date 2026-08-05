# /e2e-qa

**Agent**: E2E QA | **Phase**: on demand — recommended before `/ship` on any release, or after `/review-implementation` passes

## Trigger
Run before shipping a release, or whenever you want confidence the app actually works end-to-end (not just that unit tests pass).

## What happens
Use the e2e-qa subagent to drive the running app with Playwright and verify critical user flows on both the public site and the admin dashboard.

## Steps
1. The e2e-qa subagent loads `.claude/context/testing-strategy.md` and `.claude/context/architecture.md`
2. Confirm the dev server is reachable (start it if needed, using the commands already approved in `settings.json`)
3. Walk through every critical flow listed in `e2e-qa.md` — public browsing + enquiry links, admin auth gating, category/product/variant CRUD, image upload validation
4. Record every result as Pass / Fail / Not Verified — do NOT fix anything found here
5. Output the Flows Verified table, Failures Found, and Not Verified sections defined in `e2e-qa.md`

## Rules
- No implementation fixes in this pass — this command finds problems, it doesn't solve them
- Every critical flow must get an explicit result — nothing silently skipped
- If the dev server can't be reached at all, stop and report that instead of guessing at results

## Gate
End with: **"E2E QA complete. Run /issues to compile findings, or fix and re-run /e2e-qa to verify."**
