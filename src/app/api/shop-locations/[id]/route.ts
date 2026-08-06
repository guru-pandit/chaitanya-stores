import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { shopLocationSchema } from "@/lib/validations/shopLocation";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { fieldError } from "@/lib/fieldError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const location = await prisma.shopLocation.findUnique({ where: { id } });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(location);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

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

  try {
    const location = parsed.data.isPrimary
      ? await prisma.$transaction(async (tx) => {
          await tx.shopLocation.updateMany({ data: { isPrimary: false } });
          return tx.shopLocation.update({ where: { id }, data: parsed.data });
        })
      : await prisma.shopLocation.update({ where: { id }, data: parsed.data });

    return NextResponse.json(location);
  } catch (err) {
    // Same DB-level "exactly one primary" enforcement as POST — see that
    // route's comment.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2002" || err.code === "P2034")
    ) {
      return NextResponse.json(
        {
          error:
            "Another location was set as primary at the same moment — reload and try again.",
        },
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
