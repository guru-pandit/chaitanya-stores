"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMobileNavStore } from "@/store/mobileNavStore";

// Renders nothing — closes the mobile nav on any route change (link click,
// browser back/forward, programmatic navigation), not just explicit onClick
// handlers on individual nav links.
export function MobileNavAutoClose() {
  const pathname = usePathname();
  const close = useMobileNavStore((s) => s.close);

  useEffect(() => {
    close();
  }, [pathname, close]);

  return null;
}
