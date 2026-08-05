import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { getAllShopLocations } from "@/lib/shop-locations";
import { MandalaDivider } from "./MandalaDivider";
import { InstagramIcon, FacebookIcon } from "./SocialIcons";

export async function Footer() {
  const locations = await getAllShopLocations();
  const primary = locations.find((l) => l.isPrimary) ?? locations[0];
  const phone = primary?.phone ?? siteConfig.phone;
  const email = primary?.email ?? siteConfig.email;
  const addresses =
    locations.length > 0 ? locations.map((l) => ({ id: l.id, address: l.address })) : [{ id: "default", address: siteConfig.address }];

  return (
    <footer className="mt-24 border-t border-maroon/10 bg-maroon text-cream">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <MandalaDivider className="mb-8 text-gold/70" />
        <div className="grid gap-10 sm:grid-cols-3">
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
              <Link href="/products" className="hover:text-gold">Products</Link>
              <Link href="/about" className="hover:text-gold">About</Link>
              <Link href="/contact" className="hover:text-gold">Contact</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold">Reach Us</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-cream/80">
              <a href={`tel:${phone}`} className="hover:text-gold">{phone}</a>
              <a href={`mailto:${email}`} className="hover:text-gold">{email}</a>
              {addresses.map((a) => (
                <p key={a.id} className="flex items-start gap-1.5">
                  <MapPin size={16} className="mt-0.5 shrink-0" /> {a.address}
                </p>
              ))}
            </div>
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
