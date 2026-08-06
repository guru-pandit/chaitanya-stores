import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { siteSettingsSchema } from "@/lib/validations/settings";
import { parseJsonBody } from "@/lib/parseJsonBody";

// Singleton row — create it on first read if it doesn't exist yet.
async function getOrCreateSettings() {
  const existing = await prisma.siteSettings.findFirst();
  if (existing) return existing;
  return prisma.siteSettings.create({ data: {} });
}

export async function GET() {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const settings = await getOrCreateSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const parsed = await parseJsonBody(req, siteSettingsSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getOrCreateSettings();
  const settings = await prisma.siteSettings.update({
    where: { id: existing.id },
    data: { heroImages: JSON.stringify(parsed.data.heroImages) },
  });
  return NextResponse.json(settings);
}
