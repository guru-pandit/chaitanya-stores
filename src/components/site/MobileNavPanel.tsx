"use client";

import { useMobileNavStore } from "@/store/mobileNavStore";
import { navLinks } from "@/lib/site-config";
import { NavLink } from "./NavLink";

export function MobileNavPanel() {
  const isOpen = useMobileNavStore((s) => s.isOpen);
  const close = useMobileNavStore((s) => s.close);

  // Always mounted so the open/close state can be a CSS transition rather
  // than a mount/unmount snap. `pointer-events-none` + `aria-hidden` keep the
  // closed panel out of the way for both mouse and assistive tech.
  return (
    <div className="sm:hidden" aria-hidden={!isOpen}>
      {/* Dim the page below the header bar; tap anywhere on it to close. */}
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close menu"
        onClick={close}
        className={`fixed inset-x-0 bottom-0 top-16 z-30 bg-charcoal/40 transition-opacity duration-200 motion-reduce:transition-none ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <nav
        id="mobile-nav"
        className={`absolute inset-x-0 top-full z-40 border-b border-maroon/10 bg-cream px-4 shadow-lg transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 py-3">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} mobile>
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
