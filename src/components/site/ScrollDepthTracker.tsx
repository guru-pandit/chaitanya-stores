"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackScrollDepth } from "@/lib/analytics";

// Mounted once, sitewide, in (site)/layout.tsx. Fires scroll_50/scroll_90 at
// most once each per page — the fired-flags reset on every route change so
// depth is tracked per page, not once for the whole session.
export function ScrollDepthTracker() {
  const pathname = usePathname();
  const fired = useRef({ 50: false, 90: false });

  useEffect(() => {
    fired.current = { 50: false, 90: false };

    function handleScroll() {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const percentScrolled = (window.scrollY / scrollableHeight) * 100;

      if (!fired.current[90] && percentScrolled >= 90) {
        fired.current[90] = true;
        fired.current[50] = true;
        trackScrollDepth(90);
      } else if (!fired.current[50] && percentScrolled >= 50) {
        fired.current[50] = true;
        trackScrollDepth(50);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  return null;
}
