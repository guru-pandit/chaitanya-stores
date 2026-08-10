import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { uploadRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { saveUploadedVideo, UploadError } from "@/lib/upload";

// Deletion reuses DELETE /api/upload (src/app/api/upload/route.ts) —
// deleteUploadedImage only cares about the /uploads/ path, not the file
// type, so a separate DELETE handler here would just duplicate it.
export async function POST(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  // Shared bucket with POST /api/upload (src/lib/rate-limit.ts) — see that
  // route's comment.
  const rateLimit = uploadRateLimiter.check(guard.session.user?.email ?? "unknown");
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const path = await saveUploadedVideo(file);
    return NextResponse.json({ path }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
