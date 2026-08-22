import Link from "next/link";
import Image from "next/image";
import { navLinks } from "@/lib/site-config";
import { NavLink } from "./NavLink";
import { MobileNavToggle } from "./MobileNavToggle";
import { MobileNavPanel } from "./MobileNavPanel";
import { MobileNavAutoClose } from "./MobileNavAutoClose";

export function Header() {
  return (
    // Opaque, not the previous bg-cream/95: the sitewide backdrop
    // (SiteBackdrop) sits behind the whole page, and a translucent header
    // would let the motif scroll past underneath it. Header and footer are
    // meant to frame the backdrop, not reveal it.
    // h-16 is a fixed, deliberate height (not content-driven padding) so the
    // homepage hero can size itself off it via calc(100dvh-4rem) — a hero
    // that doesn't know the header's real height either overshoots the
    // viewport or leaves a gap under it.
    <header className="sticky top-0 z-40 h-16 border-b border-maroon/10 bg-cream">
      <MobileNavAutoClose />
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} priority className="shrink-0" />
          <span className="font-display text-xl text-maroon-dark">Chaitanya Stores</span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <MobileNavToggle />
      </div>

      <MobileNavPanel />
    </header>
  );
}
