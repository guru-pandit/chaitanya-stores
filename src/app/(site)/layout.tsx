import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SiteJsonLd } from "@/components/site/SiteJsonLd";
import { FestivalBannerModal } from "@/components/site/FestivalBannerModal";
import { getActiveFestivalBanner } from "@/lib/festival-banner";

// Every page under this layout reads live data via Prisma (Footer's shop
// locations, this layout's festival banner) — forcing the whole subtree
// dynamic here (it propagates to every nested route) stops Next from
// statically prerendering any of them at build time. Without this, a page
// with no dynamic segment and no explicit `dynamic` export of its own (e.g.
// `/catalog`) is static-eligible by default, so `next build` executes its
// Prisma calls during "Generating static pages" — which crashes the whole
// build on a transient DB outage, misleadingly attributed to whatever page
// Next happens to probe next.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const banner = await getActiveFestivalBanner();

  return (
    <>
      <FestivalBannerModal banner={banner} />
      <SiteJsonLd />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
