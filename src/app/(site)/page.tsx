import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Leaf, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseImages } from "@/lib/format";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { ProductCard } from "@/components/site/ProductCard";
import { EnquiryActions } from "@/components/site/EnquiryActions";
import { MandalaDivider } from "@/components/site/MandalaDivider";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
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
            Since generations, rooted in tradition
          </p>
          <h1 className="hero-text-glow mx-auto mt-4 max-w-2xl font-display text-4xl leading-tight text-maroon-dark sm:text-5xl">
            Incense & Pooja Essentials, Crafted with Devotion
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-charcoal/70">
            Explore our catalog of handcrafted agarbatti and pooja materials — enquire directly on
            WhatsApp, email, or call, no checkout needed.
          </p>
          <MandalaDivider className="my-8" />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
            >
              Browse Products
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-maroon/30 px-6 py-3 text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl text-maroon-dark sm:text-3xl">Featured Products</h2>
          <Link href="/products" className="text-sm font-medium text-terracotta hover:underline">
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
          Why Choose Us
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <Leaf className="mb-3 text-terracotta" size={28} />
            <p className="font-display text-lg text-maroon-dark">Natural Ingredients</p>
            <p className="mt-1 text-sm text-charcoal/70">Traditional recipes, no shortcuts.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <ShieldCheck className="mb-3 text-terracotta" size={28} />
            <p className="font-display text-lg text-maroon-dark">Trusted Quality</p>
            <p className="mt-1 text-sm text-charcoal/70">Generations of craft behind every batch.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Truck className="mb-3 text-terracotta" size={28} />
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
      </section>
    </div>
  );
}
