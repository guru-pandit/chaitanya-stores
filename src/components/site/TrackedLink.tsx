"use client";

import type { AnchorHTMLAttributes } from "react";
import { trackCallClick, trackWhatsappClick } from "@/lib/analytics";

// An <a> that fires the matching conversion event on click. Exists so Server
// Components (homepage hero, StickyEnquiryBar) can track WhatsApp/Call links
// without becoming client components themselves.
export function TrackedLink({
  track,
  productName,
  ...anchorProps
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Omit for links that carry no conversion event (e.g. mailto:). */
  track?: "whatsapp" | "call";
  productName?: string;
}) {
  return (
    <a
      {...anchorProps}
      onClick={() => {
        if (track === "whatsapp") {
          trackWhatsappClick({ sourcePage: window.location.pathname, productName });
        } else if (track === "call") {
          trackCallClick(window.location.pathname);
        }
      }}
    />
  );
}
