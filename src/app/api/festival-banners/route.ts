import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { festivalBannerSchema, toFestivalBannerData } from "@/lib/validations/festivalBanner";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getPagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const { skip, take } = getPagination(searchParams);

  const [items, total] = await Promise.all([
    prisma.festivalBanner.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.festivalBanner.count(),
  ]);
  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const parsed = await parseJsonBody(req, festivalBannerSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = toFestivalBannerData(parsed.data);

  try {
    const banner = data.isActive
      ? await prisma.$transaction(async (tx) => {
          await tx.festivalBanner.updateMany({ data: { isActive: false } });
          return tx.festivalBanner.create({ data });
        })
      : await prisma.festivalBanner.create({ data });

    return NextResponse.json(banner, { status: 201 });
  } catch (err) {
    // "At most one active" is now also enforced by a Postgres partial
    // unique index (see prisma/schema.prisma's FestivalBanner comment) —
    // same P2002/P2034 race pattern as ShopLocation.isPrimary.
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
