import Link from "next/link";
import Image from "next/image";
import { navLinks } from "@/lib/site-config";
import { NavLink } from "./NavLink";

export function Header() {
  return (
    // Opaque, not translucent: the sitewide backdrop (SiteBackdrop) sits
    // behind the whole page, and a see-through header would let the motif
    // scroll past underneath it. Header and footer frame the backdrop.
    // h-16 is a fixed, deliberate height (not content-driven padding) so the
    // homepage hero can size itself off it via calc(100dvh-4rem).
    // On mobile the nav lives in <BottomNav> (app-style tab bar), so the
    // header is just the wordmark; the top <nav> below is desktop-only.
    <header className="sticky top-0 z-40 h-16 border-b border-maroon/10 bg-cream">
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
      </div>
    </header>
  );
}
