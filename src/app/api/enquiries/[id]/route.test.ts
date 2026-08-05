import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    enquiry: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  enquiry: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

const params = Promise.resolve({ id: "enq-1" });

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/enquiries/enq-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.enquiry.findUnique.mockReset();
  mockPrisma.enquiry.update.mockReset();
});

describe("PATCH /api/enquiries/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest({ isCompleted: true }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 when isCompleted isn't a boolean", async () => {
    authed();
    const res = await PATCH(patchRequest({ isCompleted: "yes" }), { params });
    expect(res.status).toBe(400);
    expect(mockPrisma.enquiry.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the enquiry doesn't exist", async () => {
    authed();
    mockPrisma.enquiry.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest({ isCompleted: true }), { params });
    expect(res.status).toBe(404);
  });

  it("updates isCompleted and returns the row", async () => {
    authed();
    mockPrisma.enquiry.findUnique.mockResolvedValueOnce({ id: "enq-1", isCompleted: false });
    mockPrisma.enquiry.update.mockResolvedValueOnce({ id: "enq-1", isCompleted: true });

    const res = await PATCH(patchRequest({ isCompleted: true }), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.enquiry.update).toHaveBeenCalledWith({
      where: { id: "enq-1" },
      data: { isCompleted: true },
    });
  });
});
