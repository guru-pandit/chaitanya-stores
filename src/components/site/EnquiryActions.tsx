"use client";

import { Mail, Phone } from "lucide-react";
import { buildMailtoLink, buildTelLink, buildWhatsappLink, CONTACT_COMING_SOON, hasContactValue } from "@/lib/site-config";
import { WhatsAppIcon } from "./SocialIcons";
import { trackWhatsappClick, trackCallClick } from "@/lib/analytics";

export function EnquiryActions({
  whatsappNumber,
  email,
  phone,
  productName,
  className = "",
  onDark = false,
  fullWidthOnMobile = false,
}: {
  whatsappNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  productName?: string;
  className?: string;
  onDark?: boolean;
  /** Stack the three actions full-width on mobile (larger tap targets),
   *  reverting to the inline wrapped row at `sm` and up. */
  fullWidthOnMobile?: boolean;
}) {
  const callClasses = onDark
    ? "border border-cream/40 text-cream hover:bg-cream/10"
    : "border border-maroon/30 text-maroon hover:bg-maroon/5";
  const noteClasses = onDark ? "text-cream/60" : "text-charcoal/50";

  const hasWhatsapp = hasContactValue(whatsappNumber);
  const hasEmail = hasContactValue(email);
  const hasPhone = hasContactValue(phone);

  const layoutClasses = fullWidthOnMobile
    ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3"
    : "flex flex-wrap gap-3";
  const itemClasses = fullWidthOnMobile ? "w-full justify-center sm:w-auto" : "";

  // No ShopLocation configured yet and no env fallback set — never build a
  // wa.me/mailto/tel link from an empty value (see site-config.ts).
  if (!hasWhatsapp && !hasEmail && !hasPhone) {
    return <p className={`text-sm ${noteClasses} ${className}`}>{CONTACT_COMING_SOON}</p>;
  }

  return (
    <div className={`${layoutClasses} ${className}`}>
      {hasWhatsapp ? (
        <a
          href={buildWhatsappLink(whatsappNumber, productName)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsappClick({ sourcePage: window.location.pathname, productName })}
          className={`inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark ${itemClasses}`}
        >
          <WhatsAppIcon size={16} /> WhatsApp
        </a>
      ) : null}
      {hasEmail ? (
        <a
          href={buildMailtoLink(email, productName)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
            onDark ? "bg-gold text-maroon-dark hover:bg-gold-light" : "bg-maroon text-cream hover:bg-maroon-dark"
          } ${itemClasses}`}
        >
          <Mail size={16} /> Email
        </a>
      ) : null}
      {hasPhone ? (
        <a
          href={buildTelLink(phone)}
          onClick={() => trackCallClick(window.location.pathname)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${callClasses} ${itemClasses}`}
        >
          <Phone size={16} /> Call
        </a>
      ) : null}
    </div>
  );
}
