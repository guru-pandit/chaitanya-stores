import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { getPrimaryShopLocation } from "@/lib/shop-locations";

vi.mock("@/lib/prisma", () => ({
  prisma: { category: { findMany: vi.fn() } },
}));
vi.mock("@/lib/shop-locations", () => ({
  getPrimaryShopLocation: vi.fn(),
}));

const mockPrisma = prisma as unknown as { category: { findMany: ReturnType<typeof vi.fn> } };
const mockGetPrimaryShopLocation = getPrimaryShopLocation as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPrisma.category.findMany.mockReset();
  mockGetPrimaryShopLocation.mockReset();
  mockGetPrimaryShopLocation.mockResolvedValue({
    phone: "+919999999999",
    email: "hello@chaitanyastores.example",
    address: "Pune, Maharashtra, India",
  });
});

describe("GET /llms-full.txt", () => {
  it("returns markdown with the full catalog, grouped by category", async () => {
    mockPrisma.category.findMany.mockResolvedValueOnce([
      {
        name: "Agarbatti",
        description: "Traditional incense sticks",
        products: [
          {
            name: "Sandalwood Agarbatti",
            slug: "sandalwood-agarbatti",
            brand: "Cycle",
            price: 12000,
            weight: "100g",
            productType: "Masala Sticks",
            description: "Long-lasting sandalwood fragrance",
            inStock: true,
            variants: [],
          },
        ],
      },
    ]);

    const res = await GET();
    const body = await res.text();

    expect(res.headers.get("Content-Type")).toContain("text/markdown");
    expect(body).toContain("### Agarbatti");
    expect(body).toContain("Traditional incense sticks");
    expect(body).toContain("[Sandalwood Agarbatti](");
    expect(body).toContain("/catalog/sandalwood-agarbatti");
    expect(body).toContain("Cycle");
    expect(body).toContain("In Stock");
    expect(body).toContain("100g");
    expect(body).toContain("Type: Masala Sticks");
  });

  it("omits the Type line when productType is not set", async () => {
    mockPrisma.category.findMany.mockResolvedValueOnce([
      {
        name: "Agarbatti",
        description: null,
        products: [
          {
            name: "Rose Agarbatti",
            slug: "rose-agarbatti",
            brand: "Cycle",
            price: 5000,
            weight: null,
            productType: null,
            description: null,
            inStock: true,
            variants: [],
          },
        ],
      },
    ]);

    const res = await GET();
    const body = await res.text();

    expect(body).not.toContain("Type:");
  });

  it("notes an empty category instead of silently omitting it", async () => {
    mockPrisma.category.findMany.mockResolvedValueOnce([
      { name: "Camphor", description: null, products: [] },
    ]);

    const res = await GET();
    const body = await res.text();

    expect(body).toContain("### Camphor");
    expect(body).toContain("No products in this category yet");
  });
});
