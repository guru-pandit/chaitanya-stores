# Security Baseline

## Authentication & Authorization
- NextAuth (Auth.js) Credentials provider, JWT session strategy
- Password hashed with `bcrypt`/`argon2` in `AdminUser.hashedPassword` — never store plaintext, never compare with `===`
- Every route under `src/app/admin/(protected)/*` and every mutating API route (`POST`/`PATCH`/`DELETE` on `/api/products`, `/api/categories`, `/api/upload`) must check `auth()` server-side — a hidden nav link is not access control
- No public user accounts, no role matrix — a valid admin session is sufficient; do not build permission logic beyond "authenticated or not"
- Login page throttling: fail closed on repeated bad attempts (basic delay/lockout) rather than unlimited retries

## OWASP Top 10 Mitigations
| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | Every admin route + mutating API route checks `auth()` server-side, not just client-side redirects |
| A02 Crypto Failures | Passwords hashed (bcrypt/argon2); secrets via `.env`, never committed; HTTPS in production |
| A03 Injection | Prisma parameterizes all queries — never build raw SQL by string concatenation; no `$queryRawUnsafe` |
| A04 Insecure Design | Zod validates every API input server-side; client validation is UX only |
| A05 Security Misconfiguration | `.env.example` documents required vars without values; no debug flags in production build |
| A06 Vulnerable Components | Run `npm audit` before adding dependencies; no unpinned `latest` in production deps |
| A07 Auth Failures | Session cookie is `httpOnly`, `secure` in production; NextAuth handles CSRF for its own routes |
| A08 Integrity Failures | No `eval`/`Function()`; uploaded files validated by MIME/extension before write |
| A09 Logging Failures | No credentials, tokens, or session data in `console.*`; server errors logged without leaking to client response |
| A10 SSRF | No server-side fetch of user-supplied URLs; upload accepts file bytes only, not remote URLs |

## Input Validation
- Every API route body validated with the domain Zod schema — `safeParse`, never trust `req.json()` directly
- File uploads: validate MIME type and extension against an allow-list (`image/jpeg`, `image/png`, `image/webp`) and cap file size before writing to `/public/uploads`
- Never trust `searchParams`/query strings for anything beyond filtering — no dynamic file paths or SQL built from them

## Secrets Management
- All secrets via `.env` (`DATABASE_URL`, `NEXTAUTH_SECRET`, admin bootstrap credentials for seeding) — never hardcoded
- `.env` is never committed; `.env.example` lists required keys with placeholder values
- `NEXTAUTH_SECRET` must be a strong random value in production, not the dev default

## PII Handling
| Data | Storage | Rule |
|------|---------|------|
| Admin session | JWT cookie (`httpOnly`, `secure`) | Cleared on sign-out, short-lived |
| Admin password | `hashedPassword` column | Never returned in any API response, never logged |
| Enquiry contact info (name, message) | `Enquiry` table (optional feature) | Only collected via the on-site contact form with explicit submission; not exposed on any public page |

- Never render `hashedPassword` or session internals in any UI, log, or error message
- Public product/category data has no restrictions — it's meant to be public

## Data Classification
| Class | Examples | Handling |
|-------|---------|---------|
| Public | Product name, description, price, category, images | No restrictions |
| Internal | Product/category IDs, timestamps | Fine in admin UI, no need to hide but no reason to expose beyond it |
| Confidential | Admin session token, `NEXTAUTH_SECRET`, `DATABASE_URL` | Never logged, never in client bundle |
| Restricted | Admin password (hash) | Never leaves the database layer |

## PR Security Checklist
- [ ] Every new/changed admin route and mutating API route checks the session via `requireAdminSession()` (`src/lib/api-auth.ts`), not an inline `if (!session)`
- [ ] Every mutating route (including public ones like `/api/contact`) calls `verifyCsrf(req)` (`src/lib/csrf.ts`) and returns its result if non-null
- [ ] Every API route validates its body with a Zod schema (`safeParse`)
- [ ] No raw SQL string concatenation — Prisma query builder only
- [ ] No secrets or tokens in code, logs, or committed files
- [ ] New env vars added to `.env.example`, not hardcoded
- [ ] File upload validates MIME type + size before writing
- [ ] Public/abuse-prone routes and anything writing to disk are rate/quota-limited via `src/lib/rate-limit.ts` where appropriate
- [ ] `npm audit` — no new critical/high vulnerabilities from added dependencies
