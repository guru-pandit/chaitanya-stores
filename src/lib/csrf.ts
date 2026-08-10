import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Phase 4 audit finding #4: no server-side CSRF backstop on any mutating
// API route — a cross-origin POST/PATCH/DELETE with a valid session cookie
// succeeded in a live repro, protected only by the browser-enforced
// `SameSite=Lax` cookie attribute, with nothing on the server itself. This
// module is that backstop: a same-origin Origin/Referer allow-list check,
// called explicitly at the top of every mutating route handler (see
// api-conventions.md's CSRF convention) — deliberately NOT wired into
// src/proxy.ts, so it stays scoped to state-changing requests only and
// doesn't risk interfering with NextAuth's own routes or GETs.
//
// Requests with neither an Origin nor a Referer header are ALLOWED
// through — that's the normal shape of same-origin `fetch()` calls in some
// browser/proxy configurations, and it's how this app's own non-browser
// test clients (integration tests, curl, etc.) call these routes. Only a
// request that *does* present an Origin (falling back to Referer when
// Origin is absent) and whose host isn't on the allow-list is rejected.
function buildAllowedHosts(req: NextRequest): Set<string> {
  const hosts = new Set<string>();

  // The host the request actually arrived on. Deliberately read straight
  // from the Host header (nginx pins this via `proxy_set_header Host
  // $host`) rather than `req.nextUrl.host` — in the standalone Docker
  // build, Next derives `nextUrl` from HOSTNAME/PORT (e.g. "0.0.0.0:3000"),
  // not from the inbound Host header, so `req.nextUrl.host` never matches
  // the real public hostname in production and this entry would silently
  // be dead weight.
  const requestHost = req.headers.get("host");
  if (requestHost) hosts.add(requestHost);

  // The configured public site URL, plus its www/bare counterpart, so a
  // request that arrives via either "example.com" or "www.example.com"
  // (see README's www support / nginx redirect setup) is accepted
  // regardless of which one nginx terminated it as.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const { host } = new URL(siteUrl);
      hosts.add(host);
      hosts.add(host.startsWith("www.") ? host.slice(4) : `www.${host}`);
    } catch {
      // Malformed NEXT_PUBLIC_SITE_URL — ignore, the request-derived host
      // above still applies.
    }
  }

  return hosts;
}

/**
 * Returns a ready-made 403 NextResponse if the request's Origin/Referer
 * indicates a cross-origin state-changing request; otherwise returns
 * `null`, meaning the caller should proceed. The rejection body is
 * deliberately generic and never echoes the rejected origin back to the
 * caller.
 */
export function verifyCsrf(req: NextRequest): NextResponse | null {
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return null;

  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    logger.warn("csrf: unparsable Origin/Referer", { path: req.nextUrl.pathname });
    return csrfRejection();
  }

  const allowedHosts = buildAllowedHosts(req);
  if (allowedHosts.has(sourceHost)) return null;

  // Logged server-side only (never in the response body) — a
  // misconfigured NEXT_PUBLIC_SITE_URL would otherwise silently 403 every
  // admin write and the public contact form with no way to tell why.
  logger.warn("csrf: rejected cross-origin request", {
    path: req.nextUrl.pathname,
    sourceHost,
    allowedHosts: [...allowedHosts],
  });
  return csrfRejection();
}

function csrfRejection(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
