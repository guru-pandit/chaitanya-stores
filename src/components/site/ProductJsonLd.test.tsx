import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProductJsonLd } from "./ProductJsonLd";
import { siteConfig } from "@/lib/site-config";
import type { Product, Category, ProductVariant } from "@/generated/prisma/client";

function readJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script!.textContent ?? "null");
}

const category: Category = {
  id: "cat-1",
  name: "Agarbatti",
  slug: "agarbatti",
} as Category;

const baseProduct: Product & { category: Category; variants: ProductVariant[] } = {
  id: "p1",
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  description: "Long-lasting sandalwood fragrance",
  brand: "Satya",
  weight: "100g",
  productType: null,
  sku: "SAT-INC-001",
  price: 12000,
  images: "[]",
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  category,
  variants: [],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
} as unknown as Product & { category: Category; variants: ProductVariant[] };

describe("ProductJsonLd — no Offer node (price deliberately never emitted)", () => {
  it("emits Product/Brand/category/url but no offers node at all", () => {
    const { container } = render(<ProductJsonLd product={baseProduct} images={[]} />);
    const data = readJsonLd(container);

    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe(baseProduct.name);
    expect(data.brand).toEqual({ "@type": "Brand", name: baseProduct.brand });
    expect(data.category).toBe(category.name);
    expect(data.url).toBe(`${siteConfig.siteUrl}/catalog/${baseProduct.slug}`);
    // An Offer without price/priceCurrency is flagged incomplete by Google's
    // Product rich-result validation — omit it entirely rather than emit a
    // half-populated one, since price is deliberately never shown here.
    expect(data.offers).toBeUndefined();
    expect(data.price).toBeUndefined();
    expect(data.lowPrice).toBeUndefined();
    expect(data.highPrice).toBeUndefined();
  });

  it("still works for a product with variants — no offers/availability leaks in either", () => {
    const variants: ProductVariant[] = [
      { id: "v1", productId: "p1", label: "50g", price: 5000, inStock: true } as ProductVariant,
      { id: "v2", productId: "p1", label: "100g", price: 9000, inStock: false } as ProductVariant,
    ];
    const { container } = render(
      <ProductJsonLd product={{ ...baseProduct, variants }} images={[]} />
    );
    const data = readJsonLd(container);

    expect(data.offers).toBeUndefined();
    expect(data.price).toBeUndefined();
  });

  it("resolves relative image paths to absolute URLs", () => {
    const { container } = render(
      <ProductJsonLd product={baseProduct} images={["/uploads/sandalwood.jpg"]} />
    );
    const data = readJsonLd(container);

    expect(data.image).toEqual([`${siteConfig.siteUrl}/uploads/sandalwood.jpg`]);
  });
});
