import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { uploadRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { saveUploadedImage, deleteUploadedImage, UploadError } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  // Shared bucket with POST /api/upload/video (src/lib/rate-limit.ts) — a
  // real disk-fill ceiling has to count bytes from both endpoints together.
  // Keyed on email, not id: NextAuth's default session callback (no custom
  // one is configured — see src/lib/auth.config.ts) never populates
  // session.user.id, only name/email/image, so `.id` would always be
  // undefined here and every admin would silently share one "unknown"
  // bucket — worse than today. Adding a session callback to expose a
  // stable id is an auth-logic change and needs its own approved plan
  // (CLAUDE.md), not a drive-by here. email is reliably populated by the
  // Credentials provider and, for this app's single/few-admin model, a
  // sufficiently stable per-admin key in practice.
  const rateLimit = uploadRateLimiter.check(guard.session.user?.email ?? "unknown");
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const path = await saveUploadedImage(file);
    return NextResponse.json({ path }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const body = await req.json().catch(() => null);
  const path = body?.path;

  if (typeof path !== "string") {
    return NextResponse.json({ error: "No path provided" }, { status: 400 });
  }

  try {
    await deleteUploadedImage(path);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
