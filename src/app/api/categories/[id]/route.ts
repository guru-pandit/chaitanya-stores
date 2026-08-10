import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { categorySchema } from "@/lib/validations/category";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { fieldError } from "@/lib/fieldError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(category);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const { id } = await params;
  const parsed = await parseJsonBody(req, categorySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conflict = await prisma.category.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (conflict) {
    return NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
  }

  try {
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    return NextResponse.json(category);
  } catch (err) {
    // Mirrors products/[id]'s P2002 handling — a slug race that slips past
    // the pre-check above surfaces here as a unique-constraint violation
    // on the update() instead of an unhandled 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Existence check runs first (above) so a nonexistent id is a 404, not a
  // 409 — this products-still-reference-it guard only applies once we know
  // the category itself is real.
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${productCount} product(s) still use this category` },
      { status: 409 }
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    // TOCTOU backstop: the category was deleted by a concurrent request
    // between the existence check above and this delete() call.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}
