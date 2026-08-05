import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedVideo, UploadError } from "@/lib/upload";

// Deletion reuses DELETE /api/upload (src/app/api/upload/route.ts) —
// deleteUploadedImage only cares about the /uploads/ path, not the file
// type, so a separate DELETE handler here would just duplicate it.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
