"use client";

import { Menu, X } from "lucide-react";
import { useMobileNavStore } from "@/store/mobileNavStore";

export function MobileNavToggle() {
  const { isOpen, toggle } = useMobileNavStore();

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-maroon sm:hidden"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      {isOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
}
