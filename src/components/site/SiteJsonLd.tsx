import { siteConfig } from "@/lib/site-config";
import { getPrimaryShopLocation } from "@/lib/shop-locations";

// Sitewide structured data — establishes the business entity (for Knowledge
// Panel / local search) and enables Google's sitelinks search box via
// WebSite.potentialAction. Rendered once in (site)/layout.tsx, not per-page.
// telephone/email/address come from the primary shop location, not the
// global siteConfig, now that a site can have more than one shop.
export async function SiteJsonLd() {
  const primary = await getPrimaryShopLocation();
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.siteUrl,
      image: `${siteConfig.siteUrl}/logo.png`,
      telephone: primary.phone,
      email: primary.email,
      // ShopLocation.address is a single free-text field, not decomposed
      // street/city/state/postcode — streetAddress is the closest honest
      // fit without guessing at a structure the data doesn't have.
      address: {
        "@type": "PostalAddress",
        streetAddress: primary.address,
        addressCountry: "IN",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.siteUrl}/products?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
