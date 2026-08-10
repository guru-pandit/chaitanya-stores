import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopLocation: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  shopLocation: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const validBody = {
  name: "Main Branch",
  address: "123 MG Road, Pune",
  phone: "+919999999999",
  whatsappNumber: "919999999999",
  email: "main@example.com",
  isPrimary: false,
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/shop-locations", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function getRequest() {
  return new NextRequest("http://localhost/api/shop-locations");
}

describe("GET /api/shop-locations", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockPrisma.shopLocation.findMany.mockReset();
    mockPrisma.shopLocation.count.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(mockPrisma.shopLocation.findMany).not.toHaveBeenCalled();
  });

  it("returns a paginated list when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockPrisma.shopLocation.findMany.mockResolvedValueOnce([{ id: "1" }]);
    mockPrisma.shopLocation.count.mockResolvedValueOnce(1);
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "1" }], total: 1 });
  });
});

describe("POST /api/shop-locations", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockPrisma.shopLocation.count.mockReset();
    mockPrisma.shopLocation.create.mockReset();
    mockPrisma.shopLocation.updateMany.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    const res = await POST(postRequest({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("forces isPrimary true for the very first location, regardless of submitted value", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockPrisma.shopLocation.count.mockResolvedValueOnce(0);
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        shopLocation: { updateMany: vi.fn(), create: vi.fn().mockResolvedValue({ id: "1", isPrimary: true }) },
      })
    );

    const res = await POST(postRequest({ ...validBody, isPrimary: false }));

    expect(res.status).toBe(201);
    // isPrimary: true forces the transactional (unset-others) create path.
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("creates directly, without a transaction, when isPrimary is false and other locations exist", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockPrisma.shopLocation.count.mockResolvedValueOnce(1);
    mockPrisma.shopLocation.create.mockResolvedValueOnce({ id: "2", isPrimary: false });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.shopLocation.create).toHaveBeenCalledWith({ data: validBody });
  });

  it("unsets other primaries inside a transaction when creating a new primary location", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockPrisma.shopLocation.count.mockResolvedValueOnce(1);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "2", isPrimary: true });
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn({ shopLocation: { updateMany, create } })
    );

    const res = await POST(postRequest({ ...validBody, isPrimary: true }));

    expect(res.status).toBe(201);
    expect(updateMany).toHaveBeenCalledWith({ data: { isPrimary: false } });
    expect(create).toHaveBeenCalledWith({ data: { ...validBody, isPrimary: true } });
  });

  // Phase 4 audit findings #12/#13: "exactly one primary" is now also
  // enforced by a Postgres partial unique index (see prisma/schema.prisma's
  // ShopLocation comment) — a concurrent request that wins the race
  // surfaces here as P2002 (unique violation) or P2034 (transaction write
  // conflict), which must translate to a clean 409, not a raw 500.
  it.each(["P2002", "P2034"] as const)(
    "translates a %s race inside the promote-to-primary transaction into a clean 409",
    async (code) => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
      mockPrisma.shopLocation.count.mockResolvedValueOnce(1);
      mockPrisma.$transaction.mockImplementationOnce(async () => {
        throw new Prisma.PrismaClientKnownRequestError("conflict", {
          code,
          clientVersion: "test",
        });
      });

      const res = await POST(postRequest({ ...validBody, isPrimary: true }));

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/Another location was set as primary/);
    }
  );
});
