import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const rows = await prisma.product.findMany({
    distinct: ["brand"],
    select: { brand: true },
    orderBy: { brand: "asc" },
  });
  return NextResponse.json(rows.map((r) => r.brand));
}
