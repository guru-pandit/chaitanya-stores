import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductDetailPage from "./page";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";
import type { ProductVariant } from "@/generated/prisma/client";

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
    name: "Kokanvedh",
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
  price: 12000 as number | null,
  discountedPrice: null as number | null,
  isHidden: false,
  images: "[]",
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Agarbatti", slug: "agarbatti" },
  variants: [] as ProductVariant[],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

async function renderPage(overrides: Partial<typeof baseProduct> = {}) {
  mockPrisma.product.findFirst.mockResolvedValueOnce({ ...baseProduct, ...overrides });
  const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: "sandalwood-agarbatti" }) });
  render(jsx);
}

describe("ProductDetailPage — discounted price display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the discounted price, struck-through original, and % off badge when a product-level discount exists", async () => {
    // price: 12000 paise (₹120), discountedPrice: 9000 paise (₹90) → 25% off
    await renderPage({ price: 12000, discountedPrice: 9000, variants: [] });

    // Sale price is displayed prominently in green
    expect(screen.getByText("₹90")).toBeInTheDocument();
    // Original price struck through
    expect(screen.getByText("₹120")).toBeInTheDocument();
    // Percentage badge
    expect(screen.getByText("25% off")).toBeInTheDocument();
  });

  it("shows only the regular price when there is no discount (discountedPrice is null)", async () => {
    await renderPage({ price: 12000, discountedPrice: null, variants: [] });

    expect(screen.getByText("₹120")).toBeInTheDocument();
    // No "off" badge should appear
    expect(screen.queryByText(/% off/i)).not.toBeInTheDocument();
  });

  it("does not show a product-level discount badge when the product has variants but none have a discount", async () => {
    // The header badge for variant products comes from maxDiscountPercent on the variants.
    // When no variant has a discountedPrice the badge is absent.
    await renderPage({
      price: 12000,
      discountedPrice: 9000,
      variants: [
        {
          id: "v1",
          label: "100g",
          price: 12000,
          discountedPrice: null,
          inStock: true,
          productId: "p1",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      ],
    });

    // No badge of any kind — the product-level discountedPrice is ignored when variants exist
    expect(screen.queryByText(/% off/i)).not.toBeInTheDocument();
    // The Available Options section should be present
    expect(screen.getByText("Available Options")).toBeInTheDocument();
  });

  it("shows a struck-through original price and % off badge in the Available Options table for a discounted variant", async () => {
    // variant: 12000 paise (₹120) → discounted to 9000 (₹90) = 25% off
    await renderPage({
      price: null,
      discountedPrice: null,
      variants: [
        {
          id: "v1",
          label: "100g",
          price: 12000,
          discountedPrice: 9000,
          inStock: true,
          productId: "p1",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      ],
    });

    // Header shows the "Up to N% off" badge for the best variant discount
    expect(screen.getByText("Up to 25% off")).toBeInTheDocument();
    // The sale price and per-variant badge also appear in the table
    expect(screen.getAllByText("₹90").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("25% off").length).toBeGreaterThanOrEqual(1);
  });
});

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
