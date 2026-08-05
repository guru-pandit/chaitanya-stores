import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { festivalBannerSchema, toFestivalBannerData } from "@/lib/validations/festivalBanner";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getPagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, festivalBannerSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = toFestivalBannerData(parsed.data);

  const banner = data.isActive
    ? await prisma.$transaction(async (tx) => {
        await tx.festivalBanner.updateMany({ data: { isActive: false } });
        return tx.festivalBanner.create({ data });
      })
    : await prisma.festivalBanner.create({ data });

  return NextResponse.json(banner, { status: 201 });
}
