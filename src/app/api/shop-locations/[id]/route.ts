import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopLocationSchema } from "@/lib/validations/shopLocation";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { fieldError } from "@/lib/fieldError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await prisma.shopLocation.findUnique({ where: { id } });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(location);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = await parseJsonBody(req, shopLocationSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const current = await prisma.shopLocation.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (current.isPrimary && !parsed.data.isPrimary) {
    return NextResponse.json(
      fieldError(
        "isPrimary",
        "At least one location must be primary — set a different location as primary instead of unsetting this one."
      ),
      { status: 400 }
    );
  }

  const location = parsed.data.isPrimary
    ? await prisma.$transaction(async (tx) => {
        await tx.shopLocation.updateMany({ data: { isPrimary: false } });
        return tx.shopLocation.update({ where: { id }, data: parsed.data });
      })
    : await prisma.shopLocation.update({ where: { id }, data: parsed.data });

  return NextResponse.json(location);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await prisma.shopLocation.findUnique({ where: { id } });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (location.isPrimary) {
    return NextResponse.json(
      { error: "Cannot delete the primary location — set a different location as primary first." },
      { status: 409 }
    );
  }

  await prisma.shopLocation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
