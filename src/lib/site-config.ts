// Asia/Kolkata has no DST, so a fixed offset is safe here — used to anchor
// date-only values (festival banner start/end) to the business's own
// calendar day instead of UTC midnight (see src/lib/validations/festivalBanner.ts).
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";
export const BUSINESS_UTC_OFFSET = "+05:30";

export const siteConfig = {
  name: "Chaitanya Stores",
  tagline: "Traditional incense & pooja essentials, rooted in quality.",
  // Kept to ~160 chars — the sitewide default meta/OG/Twitter description
  // (see src/app/layout.tsx), so length matters for search snippet display.
  description:
    "Chaitanya Stores: traditional incense sticks, dhoop, camphor & pooja essentials from trusted brands. Browse the catalog and enquire via WhatsApp, email, or call.",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "+919999999999",
  whatsappNumber: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? "919999999999",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "hello@chaitanyastores.example",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "Pune, Maharashtra, India",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  instagramUrl: "https://instagram.com/chaitanyastores",
  facebookUrl: "https://facebook.com/chaitanyastores",
  // Shown on every product detail page, below the enquiry actions — trivially
  // editable here without touching page markup.
  productDisclaimer:
    "Actual product may differ slightly from the image shown due to handmade variations and photography.",
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
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
