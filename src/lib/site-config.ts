// Asia/Kolkata has no DST, so a fixed offset is safe here — used to anchor
// date-only values (festival banner start/end) to the business's own
// calendar day instead of UTC midnight (see src/lib/validations/festivalBanner.ts).
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";
export const BUSINESS_UTC_OFFSET = "+05:30";

// Contact-detail sentinel: an empty string means "no value configured" (no
// ShopLocation row in the DB yet, and no env var set either) — never a fake
// number/email. Call sites must check this before building a tel:/wa.me:/
// mailto: link, and fall back to CONTACT_COMING_SOON instead of rendering a
// broken link (see src/lib/shop-locations.ts's getPrimaryShopLocation()).
export const CONTACT_COMING_SOON = "Contact details coming soon";

export function hasContactValue(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

// For values that are put straight into an `href` and come from deploy-time
// env (social profile URLs) rather than a repo constant: require a real
// value AND an https:// scheme, so a typo or mis-pasted string fails closed
// to "not shown" instead of rendering a link with an arbitrary scheme.
export function isConfiguredHttpsUrl(value: string | null | undefined): value is string {
  return hasContactValue(value) && /^https:\/\//i.test(value.trim());
}

export const siteConfig = {
  name: "Chaitanya Stores",
  tagline: "Agarbatti, dhoop & pooja samagri from trusted brands in Sangmeshwar.",
  // Kept to ~160 chars — the sitewide default meta/OG/Twitter description
  // (see src/app/layout.tsx), so length matters for search snippet display.
  description:
    "Chaitanya Stores: agarbatti, dhoop, camphor & pooja samagri from trusted brands like Satya, Janak, Manohar, Anil & Forest. Browse the catalog and enquire via WhatsApp, email, or call.",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "",
  whatsappNumber: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? "",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "",
  // Coarse but true even without a precise street address — better than a
  // fabricated city the shop has no presence in. `.env.example` ships this
  // var as `""` (defined-but-empty), not unset, so `??` alone would never
  // reach this fallback in any environment cloned from that file — must
  // check for a real value the same way every other contact field does.
  address: hasContactValue(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS)
    ? process.env.NEXT_PUBLIC_BUSINESS_ADDRESS
    : "Sangmeshwar, Ratnagiri, Maharashtra 415611",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Social profiles aren't live yet. Left env-backed and empty by default —
  // the footer renders each icon only when its URL is a real value
  // (hasContactValue), so a half-configured pair (only one set) still works.
  // Fill the env var (or hard-code the URL here) when the profile goes live;
  // no schema or component change needed.
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "",
  // Shown on every product detail page, below the enquiry actions — trivially
  // editable here without touching page markup.
  productDisclaimer:
    "Actual product and packaging may differ slightly from the image shown. Please confirm price and stock before visiting.",
  // Rendered in the footer's Policies block (src/components/site/Footer.tsx).
  policies: [
    "Actual product and packaging may differ from the images shown on this website.",
    "Prices are indicative and may vary at the time of purchase; please confirm with us via WhatsApp, call, or email before visiting.",
    "Product availability is subject to change without prior notice.",
  ],
};

// Each shop location has its own WhatsApp/email/phone (see
// src/lib/shop-locations.ts) — these builders take the number/email
// explicitly rather than reading a single global contact detail.
export function buildWhatsappLink(whatsappNumber: string, productName?: string): string {
  const message = productName
    ? `Hi, I'm interested in "${productName}". Could you share more details?`
    : `Hi, I'd like to know more about your products.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoLink(email: string, productName?: string): string {
  const subject = productName ? `Enquiry: ${productName}` : "Product Enquiry";
  const body = productName
    ? `Hi, I'm interested in "${productName}". Could you share more details?`
    : `Hi, I'd like to know more about your products.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildTelLink(phone: string): string {
  return `tel:${phone}`;
}

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
