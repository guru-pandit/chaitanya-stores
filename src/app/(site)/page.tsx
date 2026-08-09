import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Sparkles, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseImages } from "@/lib/format";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { buildWhatsappLink, CONTACT_COMING_SOON, hasContactValue, siteConfig } from "@/lib/site-config";
import { ProductCard } from "@/components/site/ProductCard";
import { EnquiryActions } from "@/components/site/EnquiryActions";
import { MandalaDivider } from "@/components/site/MandalaDivider";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { EmptyState } from "@/components/ui/EmptyState";

const HOME_TITLE = "Pooja Samagri & Agarbatti Shop in Sangmeshwar | Chaitanya Stores";
const HOME_DESCRIPTION =
  "Chaitanya Stores in Sangmeshwar stocks agarbatti, dhoop, camphor & pooja samagri from trusted brands — Satya, Janak, Manohar, Anil & Forest. Browse the catalog and enquire via WhatsApp, email, or call.";

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
      where: { featured: true },
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
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-dark/60 to-cream px-4 py-20 text-center sm:px-6 sm:py-28">
        <HeroSlideshow images={heroImages} />
        <div className="relative z-10">
          <p className="hero-text-glow text-sm font-semibold uppercase tracking-[0.2em] text-terracotta">
            Trusted Brands &middot; Sangmeshwar, Ratnagiri
          </p>
          <h1 className="hero-text-glow mx-auto mt-4 max-w-2xl font-display text-4xl leading-tight text-maroon-dark sm:text-5xl">
            Agarbatti, Dhoop &amp; Pooja Samagri in Sangmeshwar
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-charcoal/70">
            Agarbatti, dhoop, camphor, and pooja thali essentials from Satya, Janak, Manohar, Anil,
            and Forest. Browse the catalog, then enquire directly on WhatsApp, email, or call — no
            online checkout, just a straight answer from the shop.
          </p>
          <MandalaDivider className="my-8" />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
            >
              Browse Catalog
            </Link>
            {hasContactValue(primaryLocation.whatsappNumber) ? (
              <a
                href={buildWhatsappLink(primaryLocation.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-maroon/30 px-6 py-3 text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
              >
                WhatsApp Us
              </a>
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

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl text-maroon-dark sm:text-3xl">Featured Products</h2>
          <Link href="/catalog" className="text-sm font-medium text-terracotta hover:underline">
            View all →
          </Link>
        </div>
        {featuredProducts.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
        <section className="bg-cream-dark/40 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 font-display text-2xl text-maroon-dark sm:text-3xl">
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group rounded-2xl border border-maroon/10 bg-white/60 p-6 text-center transition-shadow hover:shadow-lg"
                >
                  <p className="font-display text-lg text-maroon-dark group-hover:text-terracotta">
                    {category.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-center font-display text-2xl text-maroon-dark sm:text-3xl">
          Why Shop at Chaitanya Stores
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
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

      <section className="bg-maroon px-4 py-16 text-center text-cream sm:px-6">
        <h2 className="font-display text-2xl sm:text-3xl">Have a question about a product?</h2>
        <p className="mx-auto mt-2 max-w-md text-cream/80">
          Reach out directly — we reply personally to every enquiry.
        </p>
        <EnquiryActions
          className="mt-6 justify-center"
          onDark
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
