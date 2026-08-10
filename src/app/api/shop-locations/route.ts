import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { shopLocationSchema } from "@/lib/validations/shopLocation";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getPagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const { skip, take } = getPagination(searchParams);

  const [items, total] = await Promise.all([
    prisma.shopLocation.findMany({
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      skip,
      take,
    }),
    prisma.shopLocation.count(),
  ]);
  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const parsed = await parseJsonBody(req, shopLocationSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingCount = await prisma.shopLocation.count();
  // The very first location is always primary — there's no other row it
  // could defer to.
  const data = existingCount === 0 ? { ...parsed.data, isPrimary: true } : parsed.data;

  try {
    const location = data.isPrimary
      ? await prisma.$transaction(async (tx) => {
          await tx.shopLocation.updateMany({ data: { isPrimary: false } });
          return tx.shopLocation.create({ data });
        })
      : await prisma.shopLocation.create({ data });

    return NextResponse.json(location, { status: 201 });
  } catch (err) {
    // "Exactly one primary" is now also enforced by a Postgres partial
    // unique index (see prisma/schema.prisma's ShopLocation comment) — a
    // concurrent request that wins the race to be primary makes this one
    // fail with P2002 (unique violation) or P2034 (write conflict/
    // deadlock during the interactive transaction) instead of silently
    // leaving two rows primary.
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
