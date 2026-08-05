import type { Metadata } from "next";
import { getAllShopLocations } from "@/lib/shop-locations";
import { siteConfig } from "@/lib/site-config";
import { MandalaDivider } from "@/components/site/MandalaDivider";
import { EnquiryActions } from "@/components/site/EnquiryActions";
import { ShopLocationsList } from "@/components/site/ShopLocationsList";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Chaitanya Stores brings authentic, hand-rolled incense and pooja essentials from trusted brands to homes and temples that value tradition over shortcuts.",
  alternates: { canonical: "/about" },
};

// Shop locations change whenever the owner edits them in /admin — without
// this, Next would freeze this page's Prisma read at build time (same issue
// fixed on the homepage/sitemap/dashboard when Postgres was introduced).
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const locations = await getAllShopLocations();
  const primary = locations[0] ?? {
    whatsappNumber: siteConfig.whatsappNumber,
    email: siteConfig.email,
    phone: siteConfig.phone,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-center font-display text-3xl text-maroon-dark sm:text-4xl">
        Our Story
      </h1>
      <MandalaDivider className="my-8" />
      <div className="space-y-5 text-charcoal/80 leading-relaxed">
        <p>
          Chaitanya Stores began as a small family effort to bring authentic, hand-rolled
          incense and pooja essentials to homes and temples that value tradition over shortcuts.
          What started with a handful of fragrances has grown into a catalog spanning agarbatti,
          dhoop, camphor, and pooja thali essentials.
        </p>
        <p>
          Every product we offer is chosen for quality first — natural ingredients, traditional
          recipes, and consistent craftsmanship. We believe pooja items should feel as rooted and
          trustworthy as the rituals they&apos;re part of.
        </p>
        <p>
          As we grow, we&apos;re expanding into more categories while keeping the same promise: quality
          you can trust, offered simply — browse our catalog, and reach out directly to enquire.
          No clutter, no middlemen.
        </p>
      </div>
      <div className="mt-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-maroon">
          Questions about our products?
        </p>
        <EnquiryActions
          className="justify-center"
          whatsappNumber={primary.whatsappNumber}
          email={primary.email}
          phone={primary.phone}
        />
      </div>

      {locations.length > 0 && (
        <div className="mt-12">
          <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-maroon">
            Our Locations
          </p>
          <ShopLocationsList locations={locations} />
        </div>
      )}
    </div>
  );
}
