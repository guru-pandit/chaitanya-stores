import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { deleteUploadedImage } from "@/lib/upload";
import { festivalBannerSchema, toFestivalBannerData } from "@/lib/validations/festivalBanner";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const banner = await prisma.festivalBanner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(banner);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const { id } = await params;
  const parsed = await parseJsonBody(req, festivalBannerSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const current = await prisma.festivalBanner.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = toFestivalBannerData(parsed.data);

  try {
    // Unlike ShopLocation's primary, a banner going inactive with zero active
    // rows left is a normal state (between festivals) — no guard needed here.
    const banner = data.isActive
      ? await prisma.$transaction(async (tx) => {
          await tx.festivalBanner.updateMany({ data: { isActive: false } });
          return tx.festivalBanner.update({ where: { id }, data });
        })
      : await prisma.festivalBanner.update({ where: { id }, data });

    return NextResponse.json(banner);
  } catch (err) {
    // Same DB-level "at most one active" enforcement as POST — see that
    // route's comment.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2002" || err.code === "P2034")
    ) {
      return NextResponse.json(
        { error: "Another banner was set as active at the same moment — reload and try again." },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const { id } = await params;
  const banner = await prisma.festivalBanner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteUploadedImage(banner.mediaPath);
  } catch (err) {
    // Best-effort cleanup — a filesystem hiccup here should never block the
    // DB delete (deleteUploadedImage already no-ops on a missing file).
    console.error("Failed to delete festival banner media file:", err);
  }

  await prisma.festivalBanner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
