import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopLocationSchema } from "@/lib/validations/shopLocation";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getPagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, shopLocationSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingCount = await prisma.shopLocation.count();
  // The very first location is always primary — there's no other row it
  // could defer to.
  const data = existingCount === 0 ? { ...parsed.data, isPrimary: true } : parsed.data;

  const location = data.isPrimary
    ? await prisma.$transaction(async (tx) => {
        await tx.shopLocation.updateMany({ data: { isPrimary: false } });
        return tx.shopLocation.create({ data });
      })
    : await prisma.shopLocation.create({ data });

  return NextResponse.json(location, { status: 201 });
}
