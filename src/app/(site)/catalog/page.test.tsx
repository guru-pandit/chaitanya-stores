import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CatalogPage from "./page";
import { prisma } from "@/lib/prisma";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { CONTACT_COMING_SOON } from "@/lib/site-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/shop-locations", () => ({
  getPrimaryShopLocation: vi.fn(),
}));

// ProductFilters (rendered on every catalog page state) is a client
// component that needs an app router context — mock next/navigation the
// same way src/components/admin/ProductForm.test.tsx does.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/catalog",
  useSearchParams: () => new URLSearchParams(),
}));

const mockPrisma = prisma as unknown as {
  product: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  category: { findMany: ReturnType<typeof vi.fn> };
};
const mockGetPrimary = getPrimaryShopLocation as unknown as ReturnType<typeof vi.fn>;

const product = {
  id: "p1",
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  brand: "Satya",
  price: 12000,
  images: "[]",
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Agarbatti", slug: "agarbatti" },
  variants: [],
};

async function renderPage(searchParams: Record<string, string> = {}) {
  const jsx = await CatalogPage({ searchParams: Promise.resolve(searchParams) });
  render(jsx);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.category.findMany.mockResolvedValue([]);
  // findMany is called twice — once for products, once (distinct) for brands.
  // Default both to empty; individual tests override product results.
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.product.count.mockResolvedValue(0);
});

describe("CatalogPage — happy path", () => {
  it("renders a product grid when products exist", async () => {
    mockPrisma.product.findMany.mockResolvedValueOnce([product]).mockResolvedValueOnce([]);
    mockPrisma.product.count.mockResolvedValueOnce(1);
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      phone: "+919999999999",
      address: "Sangameshwar",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderPage();

    expect(screen.getByRole("link", { name: /sandalwood agarbatti/i })).toBeInTheDocument();
    expect(screen.queryByText("No products found")).not.toBeInTheDocument();
  });
});

describe("CatalogPage — search query shapes", () => {
  beforeEach(() => {
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      phone: "+919999999999",
      address: "Sangameshwar",
      name: "Chaitanya Stores",
      isPrimary: true,
    });
  });

  it("builds an OR query across name, weight, and variant label for a text search", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    await renderPage({ q: "100g" });

    const whereArg = mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: "100g", mode: "insensitive" } },
        { weight: { contains: "100g", mode: "insensitive" } },
        { variants: { some: { label: { contains: "100g", mode: "insensitive" } } } },
      ])
    );
    // no price clause for a non-numeric query
    expect(whereArg.OR.some((c: Record<string, unknown>) => "price" in c)).toBe(false);
  });

  it("includes product and variant price/discountedPrice in OR when search is a plain number", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    await renderPage({ q: "150" });

    const whereArg = mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: "150", mode: "insensitive" } },
        { weight: { contains: "150", mode: "insensitive" } },
        { variants: { some: { label: { contains: "150", mode: "insensitive" } } } },
        { price: 150 },
        { discountedPrice: 150 },
        { variants: { some: { price: 150 } } },
        { variants: { some: { discountedPrice: 150 } } },
      ])
    );
  });

  it("applies category and brand filters alongside the OR search", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    await renderPage({ q: "sandalwood", category: "agarbatti", brand: "Satya" });

    const whereArg = mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(whereArg.isHidden).toBe(false);
    expect(whereArg.category).toEqual({ slug: "agarbatti" });
    expect(whereArg.brand).toBe("Satya");
    expect(whereArg.OR).toBeDefined();
  });
});

describe("CatalogPage — empty state", () => {
  it("shows a WhatsApp CTA in the empty state when a WhatsApp number is configured", async () => {
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      phone: "+919999999999",
      address: "Sangameshwar",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderPage({ q: "nonexistent" });

    expect(screen.getByText("No products found")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /ask on whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/919999999999"));
  });

  it("shows the coming-soon fallback text (no broken wa.me link) in the empty state when no WhatsApp number is configured", async () => {
    mockGetPrimary.mockResolvedValue({
      id: null,
      whatsappNumber: "",
      email: "",
      phone: "",
      address: "",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderPage({ q: "nonexistent" });

    expect(screen.getByText("No products found")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
  });
});
