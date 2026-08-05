"use client";

import { useMobileNavStore } from "@/store/mobileNavStore";
import { navLinks } from "@/lib/site-config";
import { NavLink } from "./NavLink";

export function MobileNavPanel() {
  const isOpen = useMobileNavStore((s) => s.isOpen);

  if (!isOpen) return null;

  return (
    <nav className="flex flex-col gap-1 border-t border-maroon/10 bg-cream px-4 pb-4 sm:hidden">
      {navLinks.map((link) => (
        <NavLink key={link.href} href={link.href} mobile>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
