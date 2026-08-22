import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  product: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  category: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const validBody = {
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  description: "",
  brand: "Cycle",
  weight: "",
  productType: "Masala Sticks",
  sku: "CYC-INC-001",
  price: 12000,
  images: [],
  inStock: true,
  featured: false,
  isHidden: false,
  categoryId: "cat-1",
  variants: [],
};

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/products${query}`);
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/products", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.product.findMany.mockReset();
  mockPrisma.product.count.mockReset();
  mockPrisma.product.findUnique.mockReset();
  mockPrisma.product.create.mockReset();
  mockPrisma.category.findUnique.mockReset();
  // Every POST test exercises the slug/sku conflict + creation path, which
  // now runs behind a categoryId existence pre-check (finding #16) — default
  // to "category exists" so existing tests don't need to know about it;
  // tests for the new 400 path override this explicitly.
  mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
});

describe("GET /api/products", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("returns a paginated { items, total } shape", async () => {
    authed();
    mockPrisma.product.findMany.mockResolvedValueOnce([{ id: "1" }]);
    mockPrisma.product.count.mockResolvedValueOnce(1);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "1" }], total: 1 });
  });

  it("applies the same filter to both findMany and count", async () => {
    authed();
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.product.count.mockResolvedValueOnce(0);

    await GET(getRequest("?brand=Cycle"));

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { brand: "Cycle" } })
    );
    expect(mockPrisma.product.count).toHaveBeenCalledWith({ where: { brand: "Cycle" } });
  });
});

describe("POST /api/products", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
  });

  // Locks in finding #1: a truthy-but-userless session (e.g. a NextAuth
  // config-error shape) must still be rejected, not treated as authenticated.
  it("returns 401 when the session is truthy but has no user", async () => {
    mockAuth.mockResolvedValueOnce({} as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns a clean 400 on malformed JSON instead of a raw 500", async () => {
    authed();
    const res = await POST(
      new NextRequest("http://localhost/api/products", {
        method: "POST",
        body: "{bad json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid body", async () => {
    authed();
    const res = await POST(postRequest({ ...validBody, sku: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when categoryId does not exist (finding #16)", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.categoryId).toEqual(["Category not found"]);
    expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the slug pre-check finds a conflict", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "existing" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(409);
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the SKU pre-check finds a conflict", async () => {
    authed();
    mockPrisma.product.findUnique
      .mockResolvedValueOnce(null) // slug check passes
      .mockResolvedValueOnce({ id: "existing" }); // sku check conflicts

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(409);
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  it("creates and returns 201 on success", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.product.create.mockResolvedValueOnce({ id: "1", ...validBody });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
  });

  it("returns 201 when the body includes an optional productType", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.product.create.mockResolvedValueOnce({
      id: "1",
      ...validBody,
      productType: "Black Sticks",
    });

    const res = await POST(postRequest({ ...validBody, productType: "Black Sticks" }));

    expect(res.status).toBe(201);
  });

  it("translates a P2002 race on the sku column into a clean 409, not a raw 500", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.product.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["sku"] },
      })
    );

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.fieldErrors.sku).toEqual(["SKU already in use"]);
  });

  it("translates a P2002 race on the slug column into a clean 409, not a raw 500", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.product.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["slug"] },
      })
    );

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.fieldErrors.slug).toEqual(["Slug already in use"]);
  });
});
