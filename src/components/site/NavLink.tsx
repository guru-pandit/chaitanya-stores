"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Desktop header nav item. The mobile nav is <BottomNav>, which does its own
// active-state handling — this component is header-only now.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-terracotta ${
        active ? "text-terracotta" : "text-charcoal/80"
      }`}
    >
      {children}
    </Link>
  );
}
