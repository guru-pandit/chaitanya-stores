"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Info, Phone, type LucideIcon } from "lucide-react";
import { buildWhatsappLink, hasContactValue, navLinks } from "@/lib/site-config";
import { isProductDetailPath } from "@/lib/routes";
import { WhatsAppIcon } from "./SocialIcons";

// Mobile-only bottom tab bar — replaces the hamburger menu on small screens
// with an app-style persistent nav. Desktop keeps the top <nav> in Header.
// Purely navigation + the existing WhatsApp enquiry link; no new logic.

// Per-tab icon + extra active-path prefixes, keyed by the href in navLinks
// (the single source of truth for label + destination, shared with Header).
const TAB_META: Record<string, { Icon: LucideIcon; match?: string[] }> = {
  "/": { Icon: Home },
  "/catalog": { Icon: ShoppingBag, match: ["/catalog", "/categories"] },
  "/about": { Icon: Info },
  "/contact": { Icon: Phone },
};

type Tab = { href: string; label: string; Icon: LucideIcon; match?: string[] };

const NAV_TABS: Tab[] = navLinks.map((link) => ({
  href: link.href,
  label: link.label,
  Icon: TAB_META[link.href]?.Icon ?? Info,
  match: TAB_META[link.href]?.match,
}));

function isActive(pathname: string, tab: Tab) {
  if (tab.href === "/") return pathname === "/";
  const prefixes = tab.match ?? [tab.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function BottomNav({ whatsappNumber }: { whatsappNumber?: string | null }) {
  const pathname = usePathname();
  // Product detail carries its own StickyEnquiryBar (product-specific
  // WhatsApp / Call / Email) directly above this bar — a second WhatsApp
  // button here would be redundant and visually collide with it, so the
  // centre action drops out and the four nav tabs space evenly instead.
  const enquiryNumber =
    isProductDetailPath(pathname) || !hasContactValue(whatsappNumber) ? null : whatsappNumber;

  // WhatsApp sits in the middle as the emphasised action, matching the
  // "big centre button" pattern of shopping apps.
  const left = NAV_TABS.slice(0, 2);
  const right = NAV_TABS.slice(2);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 h-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] border-t border-maroon/15 bg-cream pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex h-[var(--bottom-nav-h)] max-w-md items-stretch justify-around">
        {left.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab)} />
        ))}

        {enquiryNumber && (
          <li className="flex flex-1 justify-center">
            <a
              href={buildWhatsappLink(enquiryNumber)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Enquire on WhatsApp"
              className="flex w-full flex-col items-center justify-center gap-1 text-xs font-medium text-terracotta-dark"
            >
              <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full border-4 border-cream bg-terracotta text-cream shadow-md">
                <WhatsAppIcon size={20} className="text-cream" />
              </span>
              Enquire
            </a>
          </li>
        )}

        {right.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab)} />
        ))}
      </ul>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const { Icon } = tab;
  return (
    <li className="flex flex-1 justify-center">
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={`flex w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
          active ? "text-terracotta-dark" : "text-charcoal/70"
        }`}
      >
        <Icon size={20} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
        {tab.label}
      </Link>
    </li>
  );
}
