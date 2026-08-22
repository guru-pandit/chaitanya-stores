import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";
import { getAllShopLocations } from "@/lib/shop-locations";
import { MandalaDivider } from "./MandalaDivider";
import { FooterShopContacts, type FooterShopContact } from "./FooterShopContacts";
import { InstagramIcon, FacebookIcon } from "./SocialIcons";

export async function Footer() {
  const locations = await getAllShopLocations();
  // Same fallback contract as getPrimaryShopLocation(): until the admin has
  // added a ShopLocation row, stand in the env-backed siteConfig details so
  // the footer never renders a contact-less block. Individual empty fields
  // are handled per-shop inside FooterShopContacts.
  const shops: FooterShopContact[] =
    locations.length > 0
      ? locations.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
          phone: l.phone,
          email: l.email,
          mapLink: l.mapLink,
          isPrimary: l.isPrimary,
        }))
      : [
          {
            id: "site-config-fallback",
            name: siteConfig.name,
            address: siteConfig.address,
            phone: siteConfig.phone,
            email: siteConfig.email,
            mapLink: null,
            isPrimary: true,
          },
        ];

  return (
    <footer className="mt-24 border-t border-maroon/10 bg-maroon text-cream">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <MandalaDivider className="mb-8 text-gold/70" />
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="flex flex-col gap-10">
            <div>
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={26} height={26} className="shrink-0" />
                <p className="font-display text-xl">{siteConfig.name}</p>
              </div>
              <p className="mt-2 text-sm text-cream/70">{siteConfig.tagline}</p>
              <div className="mt-4 flex items-center gap-4">
                <a
                  href={siteConfig.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="text-cream/80 hover:text-gold"
                >
                  <InstagramIcon size={20} />
                </a>
                <a
                  href={siteConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Facebook"
                  className="text-cream/80 hover:text-gold"
                >
                  <FacebookIcon size={20} />
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">Explore</p>
              <div className="mt-3 flex flex-col gap-2 text-sm text-cream/80">
                <Link href="/catalog" className="hover:text-gold">Catalog</Link>
                <Link href="/about" className="hover:text-gold">About</Link>
                <Link href="/contact" className="hover:text-gold">Contact</Link>
                <Link href="/sitemap.xml" className="hover:text-gold">Sitemap</Link>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold">
              {shops.length > 1 ? "Our Shops" : "Reach Us"}
            </p>
            <FooterShopContacts shops={shops} />
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Policies</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-xs text-cream/70">
            {siteConfig.policies.map((policy) => (
              <li key={policy}>{policy}</li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
