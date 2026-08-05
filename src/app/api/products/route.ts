import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { productSchema, toProductData } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getPagination } from "@/lib/pagination";
import { fieldError } from "@/lib/fieldError";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const brand = searchParams.get("brand");
  const q = searchParams.get("q");
  const { skip, take } = getPagination(searchParams);

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(brand ? { brand } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);
  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, productSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingSlug = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (existingSlug) {
    return NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
  }

  const existingSku = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existingSku) {
    return NextResponse.json(fieldError("sku", "SKU already in use"), { status: 409 });
  }

  try {
    const product = await prisma.product.create({
      data: { ...toProductData(parsed.data), variants: { create: parsed.data.variants } },
      include: { category: true, variants: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "";
      return target.includes("sku")
        ? NextResponse.json(fieldError("sku", "SKU already in use"), { status: 409 })
        : NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
    }
    throw err;
  }
}
