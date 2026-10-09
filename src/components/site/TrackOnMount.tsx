"use client";

import { useEffect } from "react";
import { gtmEvent } from "@/lib/analytics";

// Fires a single GTM event when the page it's rendered on mounts — used for
// server-rendered pages (category, product, contact) that have no other
// client-side hook to fire tracking from. Renders nothing.
export function TrackOnMount({ event, params }: { event: string; params?: Record<string, unknown> }) {
  useEffect(() => {
    gtmEvent(event, params);
    // Fire once per mount only — this tracks a page view, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
