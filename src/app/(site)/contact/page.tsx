import type { Metadata } from "next";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { buildWhatsappLink, buildMailtoLink, buildTelLink, siteConfig } from "@/lib/site-config";
import { getAllShopLocations } from "@/lib/shop-locations";
import { ContactForm } from "@/components/site/ContactForm";
import { ShopLocationsList } from "@/components/site/ShopLocationsList";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Reach Chaitanya Stores via WhatsApp, email, or phone, or send a message directly.",
  alternates: { canonical: "/contact" },
};

// Shop locations change whenever the owner edits them in /admin — without
// this, Next would freeze this page's Prisma read at build time (same issue
// fixed on the homepage/sitemap/dashboard when Postgres was introduced).
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const locations = await getAllShopLocations();
  const primary = locations[0] ?? {
    whatsappNumber: siteConfig.whatsappNumber,
    email: siteConfig.email,
    phone: siteConfig.phone,
    address: siteConfig.address,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-maroon-dark sm:text-4xl">Get in Touch</h1>
      <p className="mt-2 max-w-xl text-charcoal/70">
        Reach us directly for product enquiries, bulk orders, or anything else — we reply
        personally.
      </p>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <div className="space-y-4">
          <a
            href={buildWhatsappLink(primary.whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
          >
            <MessageCircle className="text-terracotta" size={22} />
            <div>
              <p className="text-sm font-semibold text-maroon-dark">WhatsApp</p>
              <p className="text-sm text-charcoal/70">{primary.phone}</p>
            </div>
          </a>
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
          <div className="flex items-start gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
            <MapPin className="mt-0.5 text-terracotta" size={22} />
            <div>
              <p className="text-sm font-semibold text-maroon-dark">Address</p>
              <p className="text-sm text-charcoal/70">{primary.address}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-maroon/10 bg-white/60 p-6">
          <h2 className="font-display text-xl text-maroon-dark">Send a Message</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Prefer writing it out? We&apos;ll get your message and follow up.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>

      {locations.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl text-maroon-dark">Our Locations</h2>
          <ShopLocationsList locations={locations} />
        </div>
      )}
    </div>
  );
}
