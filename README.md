# Chaitanya Stores

Marketing + catalog website for a retail business selling incense sticks (agarbatti) and pooja
materials. Visitors browse the catalog and enquire via WhatsApp, email, or call — there's no
cart, checkout, or payment gateway. The owner manages products and categories through a private
admin dashboard at `/admin`.

See `CLAUDE.md` and `.claude/context/` for full architecture, conventions, and design system docs.
See [docs/user-flows-and-data-flow.md](docs/user-flows-and-data-flow.md) for visitor/admin user
flows and data flow diagrams (public site reads, admin CRUD, auth, image upload, enquiries).

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + PostgreSQL · Zod · Zustand ·
TanStack React Query · NextAuth (Credentials)

## Setup

Requires a Postgres database to connect to (locally, run one in Docker — see below).

```bash
npm install
cp .env.example .env       # fill in values — see below, especially DATABASE_URL
npx prisma migrate dev     # applies the schema
npx prisma db seed         # sample categories/products + one admin user
npm run dev
```

Visit `http://localhost:3000` for the public site and `http://localhost:3000/admin/login` for
the dashboard.

### Local Postgres

Point `DATABASE_URL` at any reachable Postgres instance. The same `docker-compose.yml` used for
production also defines a plain `db` service, which is the easiest way to get one locally:

```bash
# fill in POSTGRES_USER/PASSWORD/DB in .env first (see .env.example)
docker compose up -d db
```

then `DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>"`
(this local-dev value uses `localhost` since `npm run dev` runs directly on your machine, not
inside the Docker network — production's `web` container instead reaches this same service at
the Docker-internal hostname `db`, which docker-compose.yml constructs automatically).

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://user:password@localhost:5432/chaitanya_stores` |
| `NEXTAUTH_SECRET` | Random secret for session signing — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the app (`http://localhost:3000` in dev) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Admin login created by `prisma db seed` |
| `NEXT_PUBLIC_BUSINESS_PHONE` / `_WHATSAPP` / `_EMAIL` / `_ADDRESS` | Contact details used in enquiry links across the site (`src/lib/site-config.ts`) |

The seed script prints the admin email/password it created — use those to log in at
`/admin/login`.

## Managing Content

All content management happens in the admin dashboard (`/admin`, protected by login), not by
editing the database directly.

### Products & Categories

1. Log in at `/admin/login`.
2. **Categories** first (`/admin/categories/new`) — a product needs a category to belong to.
3. **Products** (`/admin/products/new`) — name, brand, SKU, weight, type (optional free text,
   e.g. "Black Sticks", "Masala Sticks"), price (optional — leave blank for "contact for price"),
   description, images (upload — stored under `public/uploads`), in-stock/featured toggles.
4. New categories automatically get a public page at `/categories/<slug>` — no code changes
   needed.

Deleting a category that still has products is blocked with a clear error; remove or reassign
its products first.

**Product variants** (optional, e.g. different weights/sizes of the same product) are added
inline on the product form itself — no separate admin page. Each variant has its own label, price,
and in-stock toggle; a product with variants shows a price range on the public site instead of a
single price, and the single top-level `price` field is only used when a product has none.

### Shop Locations (`/admin/shop-locations`)

A business can have more than one physical shop. Each location has its own name, address, phone,
WhatsApp number, and email — the public Contact/About pages and enquiry links use the **primary**
location's details by default. Exactly one location is marked primary at a time ("Set Primary" on
any non-primary row); the first location you add automatically becomes primary. If no locations
are configured, the site falls back to the contact details in `src/lib/site-config.ts`
(`NEXT_PUBLIC_BUSINESS_*` env vars).

### Festival Banner (`/admin/festival-banner`)

Seasonal greeting banners (Diwali, Ganesh Chaturthi, etc.) shown to visitors once per browser
session on their first visit while active. A banner is either an image or a short video, with
optional start/end dates for reference (activation is still manual via "Set Active" — dates are
not currently enforced automatically). At most one banner is active at a time; having zero active
banners between festivals is the normal state.

### Homepage Hero Images (`/admin/hero-images`)

Upload the images that rotate in the homepage hero background. If none are set, the homepage
falls back to using the current featured products' photos instead.

### Enquiry Management (`/admin/enquiries`)

View and manage all contact form submissions from the site. Each enquiry shows the visitor's
name, contact method (WhatsApp/Email/Call), message, and related product (if any). Mark
enquiries as completed once handled to keep track of follow-ups — pending enquiries appear
first in the list. Supports pagination to browse through all submissions.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse/edit the database visually |
| `npx prisma migrate dev --name <name>` | Create + apply a new migration after schema changes |

## Deployment (Hostinger VPS + Docker)

Production runs entirely via Docker Compose on a single Hostinger VPS: `db` (Postgres 16),
`web` (this app, built from `Dockerfile`), and `nginx` (reverse proxy + TLS termination) all run
as containers, deployed automatically by `.github/workflows/deploy.yml` on every push to `main`.

```
Internet ──► nginx (80/443, only public port) ──► web:3000 (internal only)
                                                        │
                                                        ▼
                                                   db:5432 (internal only)
```

Only nginx is reachable from outside the VPS — `db` and `web` publish no host ports at all,
only the shared internal Docker network (verified: `docker compose ps` shows no `0.0.0.0:` mapping
for either).

### 1. One-time VPS setup

Do this once, before the first deploy.

1. **Create the VPS** — via Hostinger hPanel, choose the Ubuntu 24.04 LTS template on a KVM plan
   with at least 2GB RAM (see "Sizing" below re: swap on smaller plans).
2. **Create a non-root sudo user** and switch to it for everything below:
   ```bash
   adduser deploy
   usermod -aG sudo deploy
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy your key so you can still log in
   ```
3. **Harden SSH** (`/etc/ssh/sshd_config`): set `PermitRootLogin no`, `PasswordAuthentication no`,
   confirm `PubkeyAuthentication yes`, then `systemctl restart sshd`. Test logging in as `deploy`
   in a **second terminal before closing your current session**.
4. **UFW** (host firewall):
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```
5. **Hostinger hPanel VPS firewall** (optional belt-and-suspenders alongside UFW, enforced outside
   the VM entirely, if your plan includes it): in hPanel, create a firewall allowing inbound `22`
   (restrict to your known IP/office IP if it's static), `80`, `443` only; deny everything else;
   attach it to the VPS.
6. **Unattended security updates**: `apt install unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades`.
7. **Install Docker + Compose plugin**: follow Docker's official `get-docker.sh` convenience
   script, or the apt repo instructions at docs.docker.com — either way ends with `docker compose
   version` working for the `deploy` user (add them to the `docker` group: `usermod -aG docker
   deploy`, then re-login).
8. **Swap** (small VPS plans only): `next build` can need more memory than a 1–2GB VPS has
   free.
   ```bash
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```
9. **Create the deploy directory and clone the repo**:
   ```bash
   sudo mkdir -p /opt/chaitanya-stores && sudo chown deploy:deploy /opt/chaitanya-stores
   git clone <your-repo-url> /opt/chaitanya-stores
   ```
10. **Add the deploy SSH key**: generate a **dedicated** key pair used only by CI
    (`ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key`, no passphrase since it
    must run unattended), append `deploy_key.pub` to `/home/deploy/.ssh/authorized_keys` on the
    VPS (fallback: hPanel's browser terminal if SSH access isn't set up yet), and keep
    `deploy_key` (private half) for the `SSH_KEY` GitHub Secret below. Never reuse your personal
    SSH key for this.
11. **DNS**: point your domain's `A` record at the VPS's public IP — either via Hostinger hPanel's
    DNS zone editor (if the domain is also on Hostinger) or your registrar's DNS if registered
    elsewhere — and wait for it to propagate (`dig +short chaitanystores.com`) before the next
    step.
12. **Issue the first TLS certificate**:
    ```bash
    cd /opt/chaitanya-stores
    cp .env.example .env   # fill in POSTGRES_*, NEXTAUTH_*, NEXT_PUBLIC_*, DOMAIN_NAME
    DOMAIN_NAME=chaitanystores.com LETSENCRYPT_EMAIL=you@chaitanystores.com ./scripts/init-letsencrypt.sh
    ```
    This is the one-time bootstrap described in `scripts/init-letsencrypt.sh`'s own comments — it
    starts the full stack and gets nginx a real Let's Encrypt certificate.
13. **Automatic renewal**: add a cron job so the certificate never lapses:
    ```bash
    crontab -e
    # add:
    0 3 * * * cd /opt/chaitanya-stores && ./scripts/renew-certs.sh >> /var/log/certbot-renew.log 2>&1
    ```

### 2. GitHub Secrets to create

Settings → Secrets and variables → Actions → **Secrets** (not Variables — Secrets are encrypted
and masked in logs; Variables are plaintext):

| Secret | Value |
|---|---|
| `SSH_HOST` | VPS's public IP or domain |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | Private half of the **dedicated** deploy key from step 10 above |
| `DEPLOY_PATH` | `/opt/chaitanya-stores` (or wherever you cloned it) |
| `POSTGRES_USER` | A generated username (not `postgres`) |
| `POSTGRES_PASSWORD` | Strong, randomly generated (`openssl rand -base64 32`) |
| `POSTGRES_DB` | e.g. `chaitanya_stores` |
| `NEXTAUTH_SECRET` | Randomly generated (`openssl rand -base64 32`) — different from your dev value |
| `NEXTAUTH_URL` | `https://chaitanystores.com` |
| `NEXT_PUBLIC_BUSINESS_PHONE` / `_WHATSAPP` / `_EMAIL` / `_ADDRESS` | Real business contact details |
| `NEXT_PUBLIC_SITE_URL` | `https://chaitanystores.com` |
| `DOMAIN_NAME` | `chaitanystores.com` (must match what you issued the cert for) |

Fork-triggered PRs never get access to these — only pushes to `main` in this repo do. Rotate
`SSH_KEY` and `POSTGRES_PASSWORD` periodically (e.g. every 6–12 months, or immediately if you
suspect exposure).

### 3. First deploy and redeploys

The **first** deploy is step 12 above (`init-letsencrypt.sh` already brings up `db`, `web`, and
`nginx`, and runs the schema against a fresh database via the migration step built into that
script's stack). After that, **every push to `main` redeploys automatically**:

`.github/workflows/deploy.yml` connects over SSH and runs, in order: `git pull`, regenerate `.env`
from the secrets above (written with `chmod 600`, never echoed to any log), rebuild and recreate
`db`/`web`/`nginx` with `docker compose up -d --build` (this only actually rebuilds `web` — `db`
and `nginx` only restart if their own config changed), then run `prisma migrate deploy` via the
dedicated `migrate` one-off container (see the comment on that service in `docker-compose.yml` for
why it's a separate image from `web` rather than `docker compose exec web ...`).

To redeploy manually from the VPS instead of waiting for CI: `cd /opt/chaitanya-stores &&
git pull && docker compose up -d --build db web nginx && docker compose --profile tools run --rm
migrate`.

### Sizing

A 2 vCPU / 2GB RAM KVM VPS plan (or larger) is a reasonable minimum for Postgres + Next.js + nginx
together. On anything smaller, enable swap (step 8 above) — `next build` is the most memory-hungry
moment in the whole stack's lifecycle.

## Data & image persistence

**Both Postgres data and uploaded product images survive every redeploy.** This was verified
directly while building this setup: a file written into `public/uploads` and a migration applied
to the database both survived a full `docker compose stop/rm/up --build` cycle of the `web`
container (a real redeploy does the same thing, just automated by CI).

- **Postgres** — the `db` service mounts the named volume `pgdata` at
  `/var/lib/postgresql/data`. Docker volumes are not part of any container's image layer, so
  rebuilding/recreating `db` (or `web`, which doesn't touch `db` at all) never affects it.
- **Uploaded images** — the `web` service mounts the named volume `uploads` at
  `/app/public/uploads` (nginx also mounts it read-only at `/var/www/uploads` to serve files
  directly, bypassing Node for static file requests). Same guarantee: rebuilding the `web` image
  and recreating the container leaves this volume untouched.

**Commands that would destroy this data — never run these against production:**
- `docker compose down -v` — deletes every named volume, including `pgdata` and `uploads`. Nothing
  in `deploy.yml` or the scripts in this repo ever does this; if you're troubleshooting manually,
  stop before adding `-v`.
- `prisma migrate reset` — drops and recreates the entire database. The deploy path only ever
  runs `prisma migrate deploy` (forward-only, additive).
- Deleting the `pgdata`/`uploads` volumes directly (`docker volume rm`), or wiping
  `/var/lib/docker/volumes/...` on the host.

## Logs

The app logs structured JSON lines to stdout/stderr (`src/lib/logger.ts`) — no external logging
service, no extra dependency. Docker's `json-file` log driver captures both streams, so failures
are inspectable directly on the VPS:

```bash
docker compose logs -f web            # tail live
docker compose logs --since 1h web    # recent history
docker compose logs web | jq .        # pretty-print the JSON lines (if jq is installed)
```

Server-side failures (API routes, Server Components, Server Actions) are caught automatically by
`src/instrumentation.ts`'s `onRequestError` hook — no per-route try/catch needed. Browser-side
runtime errors (caught by the `error.tsx`/`global-error.tsx` boundaries) are forwarded to the same
log stream via `POST /api/log-client-error`, so a crash in a visitor's browser is visible here too,
not just in their own browser console.

`db`, `web`, and `nginx` all have Docker log rotation configured (`max-size: 10m`, `max-file: 3` —
see `docker-compose.yml`), capping on-disk log size to ~30MB per service so verbose logs can't
slowly fill a small VPS's disk.

## Backups

A named volume protects you from a **bad redeploy**. It does **not** protect you from **disk
failure, accidental `docker volume rm`, or losing the VPS entirely** — that's what this layer
is for.

- `scripts/backup.sh` — dumps Postgres (`pg_dump`, gzipped) and tars the `uploads` volume to
  `./backups/`, then pushes both to any S3-compatible object storage provider if `S3_BUCKET` /
  `S3_ENDPOINT` / AWS-style credentials are set in `.env`. Prunes local copies older than 14
  days. Install as a nightly cron job (see the script's header comment for the exact line).
- **Hostinger VPS backups/snapshots** — enable these in hPanel (if included on your plan) as a
  complementary, coarser-grained recovery layer (whole-disk, not just app data). Treat them as a
  second layer, not a replacement for the `pg_dump`/uploads backups above — a snapshot is taken on
  a schedule you don't control down to the hour, and restoring one rolls back *everything*,
  including unrelated VPS state.
- **S3-compatible object storage** (e.g. Backblaze B2, Cloudflare R2, or Hostinger Object Storage
  if enabled on your plan) is a natural off-server target for the `pg_dump`/uploads tarballs from
  `scripts/backup.sh` — create a bucket + access key pair with your chosen provider, set
  `S3_BUCKET`/`S3_ENDPOINT` (e.g. `https://s3.eu-central-003.backblazeb2.com`) and the access/secret
  key pair as `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in the VPS's `.env`, and installing
  the `aws` CLI (`apt install awscli` or `pip install awscli`) on the VPS.
- Optional: if your Hostinger plan supports attaching additional block storage, point Docker's
  data root (or just the `pgdata`/`uploads` volumes) at it, so storage can grow and be snapshotted
  independently of the VPS's boot disk. Not required at this project's scale — worth doing if the
  catalog's image library grows large.

## Security checklist

What this setup hardens:
- [x] TLS 1.2/1.3 only, modern cipher suite, HSTS (`max-age=63072000; includeSubDomains; preload`), OCSP stapling
- [x] Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`
- [x] `server_tokens off` — nginx version hidden from responses and error pages
- [x] Rate limiting on all API traffic, a stricter limit on `/api/auth/` and `/admin/login`, plus a per-IP connection cap
- [x] `db` and `web` publish **no host ports** — only reachable over the internal Docker network; nginx is the sole public entry point
- [x] Containers run as **non-root** (`web`'s `nextjs` user; `db`/`nginx` drop to their own service users after root-only setup steps) with `no-new-privileges` and `cap_drop: [ALL]` (`cap_add` only the specific capabilities each image's own entrypoint needs to start)
- [x] No secrets baked into any image or committed to the repo — the VPS's `.env` is written at deploy time from GitHub Secrets, `chmod 600`, and `.dockerignore` excludes `.env*` from the build context
- [x] Least-privilege GitHub Actions workflow token (`permissions: contents: read`) and pinned action SHAs
- [x] Healthchecks + `depends_on: condition: service_healthy` + `restart: unless-stopped` — a failed `web` build/start blocks `nginx`/`migrate` rather than leaving a half-up stack
- [x] Forward-only migrations only (`prisma migrate deploy`); nothing in the deploy path can drop data
- [x] Hostinger hPanel VPS firewall (if enabled on your plan) as a second enforcement layer alongside host UFW

What you still need to do as the operator:
- [ ] Keep the OS patched — unattended-upgrades handles most of this, but reboot after kernel updates
- [ ] Review the UFW/hPanel firewall rules periodically, especially if your admin IP changes
- [ ] Set up the nightly `scripts/backup.sh` cron job and actually test a restore at least once
- [ ] Consider `fail2ban` for SSH brute-force protection (`apt install fail2ban`, default config covers sshd)
- [ ] Monitor disk space (Postgres + accumulating uploads) and container health (`docker compose ps`, or a real monitoring tool if the site grows)
- [ ] Rotate `SSH_KEY` / `POSTGRES_PASSWORD` / `NEXTAUTH_SECRET` periodically
- [ ] Consider tightening the CSP's `script-src`/`style-src` off `'unsafe-inline'` with nonces if the admin dashboard's needs allow it — the current policy is a sensible default, not a maximally strict one

## Known Limitations

- **Single admin role.** No multi-user permissions are built in; adding them would need a real
  design pass, not a quick patch.
