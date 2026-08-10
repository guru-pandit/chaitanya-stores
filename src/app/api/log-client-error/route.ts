import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { clientErrorSchema } from "@/lib/validations/clientError";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { verifyCsrf } from "@/lib/csrf";
import { clientErrorRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// Public by necessity — a runtime error can happen to any visitor, logged in
// or not (same precedent as POST /api/contact). Nothing is persisted to the
// DB; this only forwards the error into the server-side log stream so
// browser-side crashes (currently invisible outside the visitor's own
// console) show up in `docker compose logs web` too.
export async function POST(req: NextRequest) {
  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = clientErrorRateLimiter.check(getClientIp(req));
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const parsed = await parseJsonBody(req, clientErrorSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  logger.error("Client-side error", parsed.data);
  return new NextResponse(null, { status: 204 });
}
