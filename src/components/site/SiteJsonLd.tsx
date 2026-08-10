import { hasContactValue, siteConfig } from "@/lib/site-config";
import { getPrimaryShopLocation } from "@/lib/shop-locations";

// Sitewide structured data — establishes the business entity (for Knowledge
// Panel / local search) and enables Google's sitelinks search box via
// WebSite.potentialAction. Rendered once in (site)/layout.tsx, not per-page.
// telephone/email/address come from the primary shop location, not the
// global siteConfig, now that a site can have more than one shop.
export async function SiteJsonLd() {
  const primary = await getPrimaryShopLocation();

  const storeNode: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.siteUrl,
    image: `${siteConfig.siteUrl}/logo.png`,
    // "₹₹" — moderate price range, no exact prices exposed here (this is a
    // catalog/enquiry site, not a checkout flow).
    priceRange: "₹₹",
  };

  // Never emit a placeholder ("Contact details coming soon") as if it were
  // real structured data — omit the key entirely instead when the value is
  // missing (no ShopLocation row and no env fallback configured yet).
  if (hasContactValue(primary.phone)) storeNode.telephone = primary.phone;
  if (hasContactValue(primary.email)) storeNode.email = primary.email;
  if (hasContactValue(primary.address)) {
    // ShopLocation.address is a single free-text field, not decomposed
    // street/city/state/postcode — streetAddress is the closest honest
    // fit without guessing at a structure the data doesn't have.
    storeNode.address = {
      "@type": "PostalAddress",
      streetAddress: primary.address,
      addressCountry: "IN",
    };
  }

  const data = [
    storeNode,
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.siteUrl}/catalog?q={search_term_string}`,
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
