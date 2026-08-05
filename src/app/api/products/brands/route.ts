import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.product.findMany({
    distinct: ["brand"],
    select: { brand: true },
    orderBy: { brand: "asc" },
  });
  return NextResponse.json(rows.map((r) => r.brand));
}
