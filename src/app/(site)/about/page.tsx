import type { Metadata } from "next";
import { getAllShopLocations, getPrimaryShopLocation } from "@/lib/shop-locations";
import { siteConfig } from "@/lib/site-config";
import { MandalaDivider } from "@/components/site/MandalaDivider";
import { EnquiryActions } from "@/components/site/EnquiryActions";
import { ShopLocationsList } from "@/components/site/ShopLocationsList";

const ABOUT_TITLE = "About Kokanvedh | Pooja Samagri Shop, Sangameshwar";
const ABOUT_DESCRIPTION =
  "Kokanvedh is a new pooja samagri shop in Sangameshwar, Ratnagiri, stocking agarbatti, dhoop, camphor, and pooja essentials from trusted brands. Browse online, then enquire or visit in person.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's `%s | Kokanvedh` title
  // template — this exact string has its own suffix.
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    type: "website",
    url: `${siteConfig.siteUrl}/about`,
    images: ["/logo.png"],
  },
};

// Shop locations change whenever the owner edits them in /admin — without
// this, Next would freeze this page's Prisma read at build time (same issue
// fixed on the homepage/sitemap/dashboard when Postgres was introduced).
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [locations, primary] = await Promise.all([getAllShopLocations(), getPrimaryShopLocation()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-center font-display text-3xl text-maroon-dark sm:text-4xl">
        About Kokanvedh, Sangameshwar
      </h1>
      <MandalaDivider className="my-8" />
      <div className="space-y-5 text-charcoal/80 leading-relaxed">
        <p>
          Kokanvedh is a new pooja samagri shop in Sangameshwar, started so local families can find
          agarbatti, dhoop, and pooja samagri close to home instead of travelling to Ratnagiri or
          Chiplun. We&apos;re just getting started and building our range step by step — agarbatti,
          dhoop and dhoop sticks, sambrani/dhoop cones, camphor, and pooja thali essentials like
          kumkum and chandan.
        </p>
        <p>
          We stock and resell products from trusted brands — Satya, Janak, Manohar, Anil, and Forest
          — through authorised channels. Kokanvedh does not manufacture any of these products;
          our job is to keep a well-chosen range in stock and help you find the right item.
        </p>
        <p>
          Not sure exactly what you need for a particular pooja, festival, havan, or satyanarayan
          pooja? Tell us the occasion and we&apos;ll help you pick the right fragrance or item from
          what&apos;s in stock.
        </p>
        <p>
          This website is a catalog, not an online store — there is no cart, checkout, or online
          payment. Browse the products here, then enquire via WhatsApp, email, or call, or simply
          visit the shop in person to see and buy what you need.
        </p>
      </div>
      <div className="mt-10 text-center">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-maroon">
          Questions about our products?
        </h2>
        <EnquiryActions
          className="justify-center"
          whatsappNumber={primary.whatsappNumber}
          email={primary.email}
          phone={primary.phone}
        />
      </div>

      {locations.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-maroon">
            Visit the Shop
          </h2>
          <ShopLocationsList locations={locations} />
        </div>
      )}
    </div>
  );
}
