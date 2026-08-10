import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

// Centralizes the admin-session gate for every mutating (and admin-only
// GET) API route. Phase 4 audit finding #1: 29 call sites across 15 route
// files used `if (!session) return 401`, which fails OPEN if NextAuth's
// auth() ever resolves to a truthy-but-userless object (e.g. a
// config-error shape) instead of `null` — `if (!session)` would be `false`
// and the route would proceed as though authenticated. Checking
// `session?.user` instead closes that gap; every call site now goes
// through this one helper so the check can't drift back to the buggy
// pattern route-by-route.
//
// Returns the validated session on success, or a ready-made 401
// NextResponse (body byte-identical to every route's previous inline
// check: `{ error: "Unauthorized" }`) on failure — callers do:
//
//   const guard = await requireAdminSession();
//   if ("response" in guard) return guard.response;
//   // guard.session is a valid, authenticated Session here
export async function requireAdminSession(): Promise<
  { session: Session } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
