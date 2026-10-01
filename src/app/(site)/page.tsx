import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Sparkles, MessageCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/SocialIcons";
import { TrackedLink } from "@/components/site/TrackedLink";
import { prisma } from "@/lib/prisma";
import { parseImages } from "@/lib/format";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { buildWhatsappLink, CONTACT_COMING_SOON, hasContactValue, siteConfig } from "@/lib/site-config";
import { ProductCard } from "@/components/site/ProductCard";
import { EnquiryActions } from "@/components/site/EnquiryActions";
import { MandalaDivider } from "@/components/site/MandalaDivider";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { EmptyState } from "@/components/ui/EmptyState";

const HOME_TITLE = "Pooja Samagri & Agarbatti Shop in Sangameshwar | Chaitanya Stores";
const HOME_DESCRIPTION =
  "Chaitanya Stores in Sangameshwar stocks agarbatti, dhoop, camphor & pooja samagri from trusted brands — Satya, Janak, Manohar, Anil & Forest. Browse the catalog and enquire via WhatsApp, email, or call.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's `%s | Chaitanya Stores` title
  // template — this exact string already carries its own suffix.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: siteConfig.siteUrl,
    images: ["/logo.png"],
  },
};

// Featured products and hero images change whenever the owner edits the
// catalog or hero settings in /admin — without this, Next would statically
// freeze this page's Prisma reads at build time and never reflect admin
// edits until the next deploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featuredProducts, categories, settings, primaryLocation] = await Promise.all([
    prisma.product.findMany({
      where: { featured: true, isHidden: false },
      include: { category: true, variants: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, take: 6 }),
    prisma.siteSettings.findFirst(),
    getPrimaryShopLocation(),
  ]);

  const configuredHeroImages = settings ? parseImages(settings.heroImages) : [];
  const heroImages =
    configuredHeroImages.length > 0
      ? configuredHeroImages
      : featuredProducts
          .map((product) => parseImages(product.images)[0])
          .filter((src): src is string => Boolean(src));

  return (
    <div>
      {/* Translucent rather than solid `to-cream` so the sitewide backdrop
          (SiteBackdrop) reads through the hero too — otherwise the homepage
          would be the one page where the motif is completely hidden. When
          hero photos are configured, HeroSlideshow covers this anyway and
          paints its own scrim for text legibility.
          min-h fills exactly the viewport below the sticky header (h-16, see
          Header.tsx) and centers the content block in it, rather than
          top-anchoring it under fixed padding — the previous fixed py-20/28
          left an amount of empty space below the button row that varied
          with viewport height, which on tall screens read as a stray gap
          before the next section instead of a deliberate full-bleed hero. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-cream-dark/50 to-cream/50 px-4 py-16 text-center sm:px-6 sm:py-20">
        <HeroSlideshow images={heroImages} />
        <div className="relative z-10">
          <p className="hero-text-glow text-xs font-semibold uppercase tracking-[0.15em] text-terracotta sm:text-sm sm:tracking-[0.2em]">
            Trusted Brands &middot; Sangameshwar, Ratnagiri
          </p>
          <h1 className="hero-text-glow mx-auto mt-4 max-w-2xl font-display text-3xl leading-tight text-maroon-dark sm:text-4xl lg:text-5xl">
            Agarbatti, Dhoop &amp; Pooja Samagri in Sangameshwar
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-charcoal/70 sm:text-base">
            Agarbatti, dhoop, camphor, and pooja thali essentials from Satya, Janak, Manohar, Anil,
            and Forest. Browse the catalog, then enquire directly on WhatsApp, email, or call — no
            online checkout, just a straight answer from the shop.
          </p>
          <MandalaDivider className="my-6 sm:my-8" />
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
            >
              Browse Catalog
            </Link>
            {hasContactValue(primaryLocation.whatsappNumber) ? (
              <TrackedLink
                track="whatsapp"
                href={buildWhatsappLink(primaryLocation.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-maroon/30 px-6 py-3 text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
              >
                <WhatsAppIcon size={16} /> WhatsApp Us
              </TrackedLink>
            ) : (
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-maroon/30 px-6 py-3 text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
              >
                Get in Touch
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8">
          <h2 className="font-display text-2xl text-maroon-dark sm:text-3xl">Featured Products</h2>
          <Link
            href="/catalog"
            className="shrink-0 text-sm font-medium text-terracotta hover:underline"
          >
            View all →
          </Link>
        </div>
        {featuredProducts.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No featured products yet"
            description="Check back soon, or browse the full catalog."
          />
        )}
      </section>

      {categories.length > 0 && (
        <section className="bg-cream-dark/40 px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 font-display text-2xl text-maroon-dark sm:mb-8 sm:text-3xl">
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group flex items-center justify-center rounded-2xl border border-maroon/10 bg-white/60 p-4 text-center transition-shadow hover:shadow-lg sm:p-6"
                >
                  <p className="font-display text-base text-maroon-dark group-hover:text-terracotta sm:text-lg">
                    {category.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="mb-6 text-center font-display text-2xl text-maroon-dark sm:mb-8 sm:text-3xl">
          Why Shop at Chaitanya Stores
        </h2>
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          <div className="flex flex-col items-center text-center">
            <ShieldCheck className="mb-3 text-terracotta" size={28} />
            <p className="font-display text-lg text-maroon-dark">Trusted Brands</p>
            <p className="mt-1 text-sm text-charcoal/70">
              Satya, Janak, Manohar, Anil, and Forest — stocked and sold through authorised channels.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Sparkles className="mb-3 text-terracotta" size={28} />
            <p className="font-display text-lg text-maroon-dark">Right Item for the Occasion</p>
            <p className="mt-1 text-sm text-charcoal/70">
              Tell us what the pooja or festival is — we&apos;ll help you pick the right fragrance or
              item.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <MessageCircle className="mb-3 text-terracotta" size={28} />
            <p className="font-display text-lg text-maroon-dark">Easy Enquiry</p>
            <p className="mt-1 text-sm text-charcoal/70">WhatsApp, email, or call — your choice.</p>
          </div>
        </div>
      </section>

      <section className="bg-maroon px-4 py-12 text-center text-cream sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl sm:text-3xl">Have a question about a product?</h2>
        <p className="mx-auto mt-2 max-w-md text-cream/80">
          Reach out directly — we reply personally to every enquiry.
        </p>
        <EnquiryActions
          className="mx-auto mt-6 max-w-xs sm:max-w-none sm:justify-center"
          onDark
          fullWidthOnMobile
          whatsappNumber={primaryLocation.whatsappNumber}
          email={primaryLocation.email}
          phone={primaryLocation.phone}
        />
        <p className="mx-auto mt-6 max-w-md text-sm text-cream/70">
          {hasContactValue(primaryLocation.address) ? primaryLocation.address : CONTACT_COMING_SOON}
        </p>
      </section>
    </div>
  );
}
