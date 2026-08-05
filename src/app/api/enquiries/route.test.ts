import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    enquiry: { findMany: vi.fn(), count: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  enquiry: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  product: { findMany: ReturnType<typeof vi.fn> };
};

function getRequest() {
  return new NextRequest("http://localhost/api/enquiries");
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.enquiry.findMany.mockReset();
  mockPrisma.enquiry.count.mockReset();
  mockPrisma.product.findMany.mockReset();
});

describe("GET /api/enquiries", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(mockPrisma.enquiry.findMany).not.toHaveBeenCalled();
  });

  it("returns a paginated list with product references resolved by a single batched lookup", async () => {
    authed();
    mockPrisma.enquiry.findMany.mockResolvedValueOnce([
      { id: "e1", productId: "p1", name: "Asha", isCompleted: false },
      { id: "e2", productId: null, name: "Ravi", isCompleted: false },
      { id: "e3", productId: "p1", name: "Neha", isCompleted: true },
    ]);
    mockPrisma.enquiry.count.mockResolvedValueOnce(3);
    mockPrisma.product.findMany.mockResolvedValueOnce([
      { id: "p1", name: "Sandalwood Agarbatti", slug: "sandalwood-agarbatti" },
    ]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(3);
    expect(body.items).toEqual([
      {
        id: "e1",
        productId: "p1",
        name: "Asha",
        isCompleted: false,
        product: { id: "p1", name: "Sandalwood Agarbatti", slug: "sandalwood-agarbatti" },
      },
      { id: "e2", productId: null, name: "Ravi", isCompleted: false, product: null },
      {
        id: "e3",
        productId: "p1",
        name: "Neha",
        isCompleted: true,
        product: { id: "p1", name: "Sandalwood Agarbatti", slug: "sandalwood-agarbatti" },
      },
    ]);
    // Two enquiries share productId "p1" — only one distinct id should be looked up.
    expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["p1"] } } })
    );
  });

  it("skips the product lookup entirely when no enquiry references a product", async () => {
    authed();
    mockPrisma.enquiry.findMany.mockResolvedValueOnce([
      { id: "e1", productId: null, name: "Asha", isCompleted: false },
    ]);
    mockPrisma.enquiry.count.mockResolvedValueOnce(1);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
  });
});
