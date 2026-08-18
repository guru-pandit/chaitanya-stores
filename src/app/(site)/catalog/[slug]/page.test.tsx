import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductDetailPage from "./page";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shop-locations", () => ({
  getPrimaryShopLocation: vi.fn().mockResolvedValue({
    id: "loc-1",
    name: "Chaitanya Stores",
    address: "123 Main St",
    phone: "+919999999999",
    whatsappNumber: "+919999999999",
    email: "shop@example.com",
    isPrimary: true,
  }),
}));

const mockPrisma = prisma as unknown as {
  product: { findFirst: ReturnType<typeof vi.fn> };
};

const baseProduct = {
  id: "p1",
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  description: "Long-lasting sandalwood fragrance",
  brand: "Cycle",
  weight: "100g",
  productType: null as string | null,
  sku: "CYC-INC-001",
  price: 12000,
  images: "[]",
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Agarbatti", slug: "agarbatti" },
  variants: [],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

async function renderPage(overrides: Partial<typeof baseProduct> = {}) {
  mockPrisma.product.findFirst.mockResolvedValueOnce({ ...baseProduct, ...overrides });
  const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: "sandalwood-agarbatti" }) });
  render(jsx);
}

describe("ProductDetailPage — productType & disclaimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a Type row when the product has a productType", async () => {
    await renderPage({ productType: "Masala Sticks" });

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Masala Sticks")).toBeInTheDocument();
  });

  it("omits the Type row when the product has no productType", async () => {
    await renderPage({ productType: null });

    expect(screen.queryByText("Type")).not.toBeInTheDocument();
  });

  it("always renders the product disclaimer, regardless of productType", async () => {
    await renderPage({ productType: null });

    expect(screen.getByText(siteConfig.productDisclaimer)).toBeInTheDocument();
  });
});
