import { siteConfig } from "@/lib/site-config";

// BreadcrumbList structured data — helps search results show a breadcrumb
// trail instead of a raw URL. `items` excludes Home; it's prepended here
// since every trail on this site starts there.
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const trail = [{ name: "Home", path: "/" }, ...items];

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.siteUrl}${item.path}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
