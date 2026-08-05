import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSkuPrefix } from "@/lib/format";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand");
  const categoryId = searchParams.get("categoryId");
  if (!brand || !categoryId) {
    return NextResponse.json({ error: "brand and categoryId are required" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const prefix = buildSkuPrefix(brand, category.name);
  const existing = await prisma.product.findMany({
    where: { sku: { startsWith: `${prefix}-` } },
    select: { sku: true },
  });

  const max = existing.reduce((max, { sku }) => {
    const suffix = sku?.slice(prefix.length + 1) ?? "";
    const n = /^\d+$/.test(suffix) ? Number(suffix) : 0;
    return Math.max(max, n);
  }, 0);

  const next = String(max + 1).padStart(4, "0");
  return NextResponse.json({ sku: `${prefix}-${next}` });
}
