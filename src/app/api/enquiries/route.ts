import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const { skip, take } = getPagination(searchParams);

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.enquiry.count(),
  ]);

  // Enquiry.productId is a plain string, not a Prisma relation — the
  // product it names may since have been edited or deleted — so product
  // names are resolved via one batched lookup instead of a per-row query.
  const productIds = [
    ...new Set(enquiries.map((e) => e.productId).filter((id): id is string => !!id)),
  ];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const items = enquiries.map((enquiry) => ({
    ...enquiry,
    product: enquiry.productId ? (productById.get(enquiry.productId) ?? null) : null,
  }));

  return NextResponse.json({ items, total });
}
