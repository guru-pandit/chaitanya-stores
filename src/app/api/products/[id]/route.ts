import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { productSchema, toProductData } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { fieldError } from "@/lib/fieldError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: true },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const { id } = await params;
  const parsed = await parseJsonBody(req, productSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json(fieldError("categoryId", "Category not found"), { status: 400 });
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

  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: { ...toProductData(parsed.data), variants: { create: parsed.data.variants } },
        include: { category: true, variants: true },
      });
    });
    return NextResponse.json(product);
  } catch (err) {
    // Mirrors POST /api/products's P2002 handling — a slug/sku race that
    // slips past the pre-checks above surfaces here as a unique-constraint
    // violation on the update() instead of an unhandled 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "";
      return target.includes("sku")
        ? NextResponse.json(fieldError("sku", "SKU already in use"), { status: 409 })
        : NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json(fieldError("categoryId", "Category not found"), { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    // TOCTOU backstop: the product was deleted by a concurrent request
    // between the existence check above and this delete() call.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}
