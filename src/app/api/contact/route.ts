import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { verifyCsrf } from "@/lib/csrf";
import { contactRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// Not a real cuid — just shaped like one (Prisma ids here are
// `@default(cuid())`) so the honeypot's fake-success response below isn't
// trivially distinguishable from a real one by id format alone. Real cuids
// are base36 (0-9, a-z) — drawing from the same alphabet here (rather than
// hex, a strict subset) keeps a charset comparison from telling the two
// apart.
function fakeCuid(): string {
  let id = "c";
  while (id.length < 25) {
    id += Math.floor(Math.random() * 36).toString(36);
  }
  return id;
}

export async function POST(req: NextRequest) {
  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = contactRateLimiter.check(getClientIp(req));
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const parsed = await parseJsonBody(req, contactSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Honeypot field is never part of the Enquiry model — strip it before any
  // Prisma write regardless of outcome.
  const { hp_ref, ...data } = parsed.data;

  if (hp_ref) {
    // A bot filled in the hidden field. Respond as close to a real success
    // as possible (same status, same field shape — a real cuid-looking id
    // and an explicit `productId: null` rather than an omitted key) so the
    // bot can't trivially tell the two apart by response shape, but never
    // persist an Enquiry row for it.
    return NextResponse.json(
      {
        id: fakeCuid(),
        ...data,
        productId: data.productId ?? null,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }

  const enquiry = await prisma.enquiry.create({ data });
  return NextResponse.json(enquiry, { status: 201 });
}
