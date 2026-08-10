import type { Metadata } from "next";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import {
  buildWhatsappLink,
  buildMailtoLink,
  buildTelLink,
  CONTACT_COMING_SOON,
  hasContactValue,
  siteConfig,
} from "@/lib/site-config";
import { getAllShopLocations, getPrimaryShopLocation } from "@/lib/shop-locations";
import { ContactForm } from "@/components/site/ContactForm";
import { ShopLocationsList } from "@/components/site/ShopLocationsList";

const CONTACT_TITLE = "Contact Chaitanya Stores | Pooja Samagri Shop, Sangmeshwar";
const CONTACT_DESCRIPTION =
  "Reach Chaitanya Stores in Sangmeshwar via WhatsApp, email, or phone, or send a message directly. Bulk festival quantities welcome — prices and stock confirmed on enquiry.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's `%s | Chaitanya Stores` title
  // template — this exact string has its own suffix.
  title: { absolute: CONTACT_TITLE },
  description: CONTACT_DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    type: "website",
    url: `${siteConfig.siteUrl}/contact`,
  },
};

// Shop locations change whenever the owner edits them in /admin — without
// this, Next would freeze this page's Prisma read at build time (same issue
// fixed on the homepage/sitemap/dashboard when Postgres was introduced).
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  // getPrimaryShopLocation() explicitly selects the isPrimary:true row (with
  // its own env-backed fallback chain) rather than assuming array order —
  // same helper Home/Footer/JSON-LD/llms-full.txt use, so this page can't
  // silently drift from the rest of the site's contact details.
  const [locations, primary] = await Promise.all([getAllShopLocations(), getPrimaryShopLocation()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-maroon-dark sm:text-4xl">
        Contact Chaitanya Stores, Sangmeshwar
      </h1>
      <p className="mt-2 max-w-xl text-charcoal/70">
        Reach us directly to check price and stock, ask about a product, or plan a bulk order for a
        festival — we reply personally. This is a catalog site, not an online store, so every order
        is confirmed by us before you visit.
      </p>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <div className="space-y-4">
          {hasContactValue(primary.whatsappNumber) ? (
            <a
              href={buildWhatsappLink(primary.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
            >
              <MessageCircle className="text-terracotta" size={22} />
              <div>
                <p className="text-sm font-semibold text-maroon-dark">WhatsApp — fastest reply</p>
                <p className="text-sm text-charcoal/70">{primary.whatsappNumber}</p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
              <MessageCircle className="text-terracotta" size={22} />
              <div>
                <p className="text-sm font-semibold text-maroon-dark">WhatsApp — fastest reply</p>
                <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
              </div>
            </div>
          )}

          {hasContactValue(primary.email) ? (
            <a
              href={buildMailtoLink(primary.email)}
              className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
            >
              <Mail className="text-terracotta" size={22} />
              <div>
                <p className="text-sm font-semibold text-maroon-dark">Email</p>
                <p className="text-sm text-charcoal/70">{primary.email}</p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
              <Mail className="text-terracotta" size={22} />
              <div>
                <p className="text-sm font-semibold text-maroon-dark">Email</p>
                <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
              </div>
            </div>
          )}

          {hasContactValue(primary.phone) ? (
            <a
              href={buildTelLink(primary.phone)}
              className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
            >
              <Phone className="text-terracotta" size={22} />
              <div>
                <p className="text-sm font-semibold text-maroon-dark">Call</p>
                <p className="text-sm text-charcoal/70">{primary.phone}</p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
              <Phone className="text-terracotta" size={22} />
              <div>
                <p className="text-sm font-semibold text-maroon-dark">Call</p>
                <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
            <MapPin className="mt-0.5 text-terracotta" size={22} />
            <div>
              <p className="text-sm font-semibold text-maroon-dark">Address</p>
              <p className="text-sm text-charcoal/70">
                {hasContactValue(primary.address) ? primary.address : CONTACT_COMING_SOON}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-maroon/10 bg-white/60 p-6">
          <h2 className="font-display text-xl text-maroon-dark">Send a Message</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Prefer writing it out? We&apos;ll get your message and follow up.
          </p>
          <div className="mt-5">
            <ContactForm whatsappNumber={primary.whatsappNumber} />
          </div>
        </div>
      </div>

      {locations.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl text-maroon-dark">Visit the Shop</h2>
          <ShopLocationsList locations={locations} />
        </div>
      )}
    </div>
  );
}
