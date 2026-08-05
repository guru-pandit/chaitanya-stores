import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  category: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const validBody = { name: "Incense", slug: "incense", description: "", image: "" };

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/categories${query}`);
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/categories", {
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
  mockPrisma.category.findMany.mockReset();
  mockPrisma.category.count.mockReset();
  mockPrisma.category.findUnique.mockReset();
  mockPrisma.category.create.mockReset();
});

describe("GET /api/categories", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("returns a paginated { items, total } shape", async () => {
    authed();
    mockPrisma.category.findMany.mockResolvedValueOnce([{ id: "1" }]);
    mockPrisma.category.count.mockResolvedValueOnce(1);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "1" }], total: 1 });
  });

  it("passes page/limit through as skip/take", async () => {
    authed();
    mockPrisma.category.findMany.mockResolvedValueOnce([]);
    mockPrisma.category.count.mockResolvedValueOnce(0);

    await GET(getRequest("?page=2&limit=5"));

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 })
    );
  });
});

describe("POST /api/categories", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns a clean 400 on malformed JSON instead of a raw 500", async () => {
    authed();
    const res = await POST(
      new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: "{bad json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid body", async () => {
    authed();
    const res = await POST(postRequest({ ...validBody, name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the slug pre-check finds a conflict", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "existing" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(409);
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("creates and returns 201 on success", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    mockPrisma.category.create.mockResolvedValueOnce({ id: "1", ...validBody });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
  });

  it("translates a P2002 unique-constraint race on create() into a clean 409, not a raw 500", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null); // pre-check passes...
    mockPrisma.category.create.mockRejectedValueOnce(
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
