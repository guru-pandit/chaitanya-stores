"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Info, Phone } from "lucide-react";
import { buildWhatsappLink, hasContactValue } from "@/lib/site-config";
import { WhatsAppIcon } from "./SocialIcons";

// Mobile-only bottom tab bar — replaces the hamburger menu on small screens
// with an app-style persistent nav. Desktop keeps the top <nav> in Header.
// Purely navigation + the existing WhatsApp enquiry link; no new logic.

type Tab = {
  href: string;
  label: string;
  Icon: typeof Home;
  /** extra path prefixes that should also light this tab up */
  match?: string[];
};

const NAV_TABS: Tab[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/catalog", label: "Catalog", Icon: ShoppingBag, match: ["/catalog", "/categories"] },
  { href: "/about", label: "About", Icon: Info },
  { href: "/contact", label: "Contact", Icon: Phone },
];

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
  const onProductDetail = pathname.startsWith("/catalog/") && pathname !== "/catalog";
  const showWhatsapp = hasContactValue(whatsappNumber) && !onProductDetail;

  // WhatsApp sits in the middle as the emphasised action, matching the
  // "big centre button" pattern of shopping apps.
  const left = NAV_TABS.slice(0, 2);
  const right = NAV_TABS.slice(2);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-maroon/15 bg-cream pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {left.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab)} />
        ))}

        {showWhatsapp && (
          <li className="flex flex-1 justify-center">
            <a
              href={buildWhatsappLink(whatsappNumber!)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Enquire on WhatsApp"
              className="flex w-full flex-col items-center gap-1 pb-1.5 pt-1 text-[10px] font-medium text-terracotta"
            >
              <span className="-mt-4 flex h-11 w-11 items-center justify-center rounded-full border-4 border-cream bg-terracotta text-cream shadow-md">
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
        className={`flex w-full flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
          active ? "text-terracotta" : "text-charcoal/55"
        }`}
      >
        <Icon size={20} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
        {tab.label}
      </Link>
    </li>
  );
}
