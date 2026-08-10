// Shared helpers for the `*.route.integration.test.ts` suite — these tests
// exercise the real Next.js dev server over HTTP (not the route handlers
// in-process), against the isolated `chaitanya_audit_test` Postgres DB
// described in docs/audit/phase0-attack-surface.md. See CLAUDE.md's Testing
// Strategy for how this differs from the mocked-Prisma unit tests that live
// alongside each route as `route.test.ts`.
//
// Follow-up (not solved here): these tests assume a live server is already
// running at TEST_BASE_URL and will fail loudly (not skip) if it isn't.
// Wiring an automatic skip-if-unreachable guard is left for whoever adds
// this suite to CI.
//
// Run with `npx vitest run integration --fileParallelism=false`. Vitest's
// default is to run test *files* in parallel worker threads — fine for the
// mocked-Prisma unit tests, but this suite hits one shared, stateful,
// already-running Postgres DB, and a couple of routes (ShopLocation.isPrimary,
// FestivalBanner.isActive) enforce a "at most one row" invariant across the
// *entire* table. Two files that each create/promote a row in the same table
// at the same moment can observe each other's writes mid-test and produce a
// spurious assertion failure — not an application bug, just two workers
// racing over one shared resource. Serializing file execution removes that
// class of flake; per-test timeouts above already assume the serialized,
// slower-but-deterministic run.

import { vi } from "vitest";

// Real network round-trips against a dev-mode Next server (no production
// build/caching) — plus ~19 integration test files' worth of concurrent
// traffic hitting the same single dev server process — comfortably blow
// past Vitest's 5s default per-test timeout, especially for tests that
// chain several sequential requests (create -> get -> patch -> get ->
// delete -> get). Any test file that imports this helper opts into a more
// realistic timeout as a side effect of the import.
vi.setConfig({ testTimeout: 30_000 });

export const TEST_BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3100";

const ADMIN_EMAIL = process.env.AUDIT_ADMIN_EMAIL ?? "audit-admin@chaitanyastores.example";
const ADMIN_PASSWORD = process.env.AUDIT_ADMIN_PASSWORD ?? "AuditPass!2026Test";

let cookiePromise: Promise<string> | null = null;

async function login(): Promise<string> {
  const csrfRes = await fetch(`${TEST_BASE_URL}/api/auth/csrf`);
  if (!csrfRes.ok) {
    throw new Error(
      `Could not reach test server at ${TEST_BASE_URL} (GET /api/auth/csrf -> ${csrfRes.status}). ` +
        `These are live-server integration tests — start the dev server (and point TEST_BASE_URL at it) before running them.`
    );
  }
  const csrfCookies = csrfRes.headers.getSetCookie().map((c) => c.split(";")[0]);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const loginRes = await fetch(`${TEST_BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies.join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      redirect: "false",
      json: "true",
    }).toString(),
    redirect: "manual",
  });

  const sessionCookie = loginRes.headers
    .getSetCookie()
    .find((c) => c.startsWith("authjs.session-token="));
  if (!sessionCookie) {
    throw new Error(
      `Admin login failed against ${TEST_BASE_URL} (callback status ${loginRes.status}) — ` +
        `check that .env.audit's SEED_ADMIN_EMAIL/PASSWORD match the seeded AdminUser row.`
    );
  }
  return sessionCookie.split(";")[0];
}

/** Cached per test-module — one real login per test file, not per test. */
export function getAuthCookie(): Promise<string> {
  if (!cookiePromise) cookiePromise = login();
  return cookiePromise;
}

/**
 * fetch() against the live test server. Defaults to attaching the admin
 * session cookie; pass `{ auth: false }` to exercise the unauthenticated path.
 * JSON bodies get `Content-Type: application/json` automatically unless the
 * caller already set one (e.g. for multipart/form-data uploads).
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  opts: { auth?: boolean } = {}
): Promise<Response> {
  const { auth = true } = opts;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    headers.set("Cookie", await getAuthCookie());
  }
  return fetch(`${TEST_BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
}

export function apiJson(path: string, body: unknown, init: RequestInit = {}, opts?: { auth?: boolean }) {
  return apiFetch(path, { ...init, method: init.method ?? "POST", body: JSON.stringify(body) }, opts);
}

/** Unique-ish token per test run so slug/sku/email fields never collide across repeated runs against the same persistent DB. */
export function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Minimal 1x1 PNG / tiny valid JPEG magic-byte buffers, for upload tests —
// real bytes so src/lib/upload.ts's signature sniffing accepts them.
export const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export function pngFile(name = "test.png"): File {
  const bytes = Buffer.from(PNG_1X1_BASE64, "base64");
  return new File([bytes], name, { type: "image/png" });
}

export function textFileDisguisedAsPng(name = "fake.png"): File {
  // Legit-looking filename/MIME, but bytes are plain text — should be
  // rejected by the magic-byte sniff in src/lib/upload.ts, not the
  // extension or client-supplied Content-Type.
  return new File([Buffer.from("not actually an image")], name, { type: "image/png" });
}

export function mp4File(name = "test.mp4"): File {
  // Minimal buffer whose bytes[4..8] spell "ftyp" — enough for
  // src/lib/upload.ts's sniffFileSignature to detect video/mp4.
  const bytes = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftypmp42"),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ]);
  return new File([bytes], name, { type: "video/mp4" });
}

export function textFileDisguisedAsMp4(name = "fake.mp4"): File {
  return new File([Buffer.from("not actually a video")], name, { type: "video/mp4" });
}
