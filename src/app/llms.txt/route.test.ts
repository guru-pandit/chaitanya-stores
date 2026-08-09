import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { category: { findMany: vi.fn() } },
}));

const mockPrisma = prisma as unknown as { category: { findMany: ReturnType<typeof vi.fn> } };

beforeEach(() => {
  mockPrisma.category.findMany.mockReset();
});

describe("GET /llms.txt", () => {
  it("returns markdown with the site overview, key pages, and a link to llms-full.txt", async () => {
    mockPrisma.category.findMany.mockResolvedValueOnce([]);

    const res = await GET();
    const body = await res.text();

    expect(res.headers.get("Content-Type")).toContain("text/markdown");
    expect(body).toContain("# Chaitanya Stores");
    expect(body).toContain("/catalog");
    expect(body).toContain("/llms-full.txt");
    expect(body).toContain("/sitemap.xml");
  });

  it("lists each category with its product count", async () => {
    mockPrisma.category.findMany.mockResolvedValueOnce([
      { name: "Agarbatti", slug: "agarbatti", description: null, _count: { products: 3 } },
    ]);

    const res = await GET();
    const body = await res.text();

    expect(body).toContain("[Agarbatti](");
    expect(body).toContain("/categories/agarbatti");
    expect(body).toContain("3 products");
  });
});
