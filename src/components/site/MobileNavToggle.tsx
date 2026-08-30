"use client";

import { Menu, X } from "lucide-react";
import { useMobileNavStore } from "@/store/mobileNavStore";

export function MobileNavToggle() {
  const { isOpen, toggle } = useMobileNavStore();

  return (
    <button
      type="button"
      onClick={toggle}
      className="-mr-2.5 p-2.5 text-maroon sm:hidden"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      aria-controls="mobile-nav"
    >
      {isOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
}
