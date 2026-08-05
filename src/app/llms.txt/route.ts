import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

// The llms.txt convention (llmstxt.org) — a concise, markdown overview of
// the site for LLM agents/crawlers, analogous to robots.txt/sitemap.xml but
// aimed at language models rather than search crawlers. Generated at
// request time (not a static /public file) so it always reflects the
// current catalog, same reasoning as sitemap.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

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
    "## Site",
    "",
    `- [Home](${siteConfig.siteUrl}/): Featured products and categories`,
    `- [All Products](${siteConfig.siteUrl}/products): Full catalog, filterable by category and brand`,
    `- [About](${siteConfig.siteUrl}/about): About ${siteConfig.name}`,
    `- [Contact](${siteConfig.siteUrl}/contact): Shop locations, contact details, and enquiry form`,
    "",
  ];

  if (categories.length > 0) {
    lines.push("## Categories", "");
    for (const category of categories) {
      const count = `${category._count.products} product${category._count.products === 1 ? "" : "s"}`;
      const description = category.description ? ` — ${category.description}` : "";
      lines.push(
        `- [${category.name}](${siteConfig.siteUrl}/categories/${category.slug}): ${count}${description}`
      );
    }
    lines.push("");
  }

  lines.push(
    "## Notes for automated agents",
    "",
    "- No cart, checkout, or online payment on this site — enquire via WhatsApp, email, or phone to purchase.",
    "- Prices are in INR. A product with no listed price means \"Contact for price\".",
    `- Full machine-readable product listing: ${siteConfig.siteUrl}/llms-full.txt`,
    `- Sitemap: ${siteConfig.siteUrl}/sitemap.xml`
  );

  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
