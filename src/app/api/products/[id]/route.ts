import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema, toProductData } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { fieldError } from "@/lib/fieldError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: true },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = await parseJsonBody(req, productSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const conflict = await prisma.product.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (conflict) {
    return NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
  }

  const skuConflict = await prisma.product.findFirst({
    where: { sku: parsed.data.sku, NOT: { id } },
  });
  if (skuConflict) {
    return NextResponse.json(fieldError("sku", "SKU already in use"), { status: 409 });
  }

  const product = await prisma.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId: id } });
    return tx.product.update({
      where: { id },
      data: { ...toProductData(parsed.data), variants: { create: parsed.data.variants } },
      include: { category: true, variants: true },
    });
  });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
