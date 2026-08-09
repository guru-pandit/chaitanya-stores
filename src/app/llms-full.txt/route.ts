import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasContactValue, siteConfig } from "@/lib/site-config";
import { formatPrice, formatVariantPrice } from "@/lib/format";
import { getPrimaryShopLocation } from "@/lib/shop-locations";

// The "full" counterpart to /llms.txt (llmstxt.org) — same site overview,
// followed by the complete catalog (every category, every product) instead
// of just top-level links, for agents that want the full text content in
// one request rather than crawling each page. Generated at request time so
// it always reflects the current catalog.
export const dynamic = "force-dynamic";

export async function GET() {
  const [categories, primaryLocation] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        products: {
          include: { variants: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    getPrimaryShopLocation(),
  ]);

  // Omit any missing part rather than emitting a dangling separator (e.g.
  // "Contact:  ·  · Sangmeshwar…") — same convention SiteJsonLd follows.
  const contactParts = [primaryLocation.phone, primaryLocation.email, primaryLocation.address].filter(
    hasContactValue
  );

  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.tagline}`,
    "",
    siteConfig.description,
    "",
    "This is a catalog/marketing site, not an online store — there is no cart, checkout, or " +
      "payment. Visitors browse the catalog and enquire via WhatsApp, email, or phone call.",
    "",
    ...(contactParts.length > 0 ? [`Contact: ${contactParts.join(" · ")}`, ""] : []),
    `- [Home](${siteConfig.siteUrl}/)`,
    `- [Catalog](${siteConfig.siteUrl}/catalog)`,
    `- [About](${siteConfig.siteUrl}/about)`,
    `- [Contact](${siteConfig.siteUrl}/contact)`,
    "",
    "## Full Catalog",
  ];

  for (const category of categories) {
    lines.push("", `### ${category.name}`, "");
    if (category.description) lines.push(category.description, "");
    if (category.products.length === 0) {
      lines.push("_No products in this category yet._");
      continue;
    }

    for (const product of category.products) {
      const hasVariants = product.variants.length > 0;
      const price = hasVariants ? formatVariantPrice(product.variants) : formatPrice(product.price);
      const stock = hasVariants
        ? product.variants.some((v) => v.inStock)
          ? "In Stock"
          : "Out of Stock"
        : product.inStock
          ? "In Stock"
          : "Out of Stock";

      lines.push(`- **[${product.name}](${siteConfig.siteUrl}/catalog/${product.slug})**`);
      lines.push(`  Brand: ${product.brand} · Price: ${price} · ${stock}`);
      if (product.productType) lines.push(`  Type: ${product.productType}`);
      if (!hasVariants && product.weight) lines.push(`  Weight/Quantity: ${product.weight}`);
      if (product.description) lines.push(`  ${product.description}`);
    }
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
