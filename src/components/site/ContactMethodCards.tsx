"use client";

import { Mail, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/SocialIcons";
import {
  buildWhatsappLink,
  buildMailtoLink,
  buildTelLink,
  CONTACT_COMING_SOON,
  hasContactValue,
} from "@/lib/site-config";
import { trackWhatsappClick, trackCallClick } from "@/lib/analytics";

// The contact page's own WhatsApp/Email/Call cards — visually distinct from
// EnquiryActions (full card with label + value, not a pill button), but the
// same click_whatsapp/click_call tracking. Split out into its own client
// component because the contact page itself is an async Server Component
// (fetches shop locations directly via Prisma) and can't carry onClick
// handlers itself.
export function ContactMethodCards({
  whatsappNumber,
  email,
  phone,
}: {
  whatsappNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    <>
      {hasContactValue(whatsappNumber) ? (
        <a
          href={buildWhatsappLink(whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsappClick({ sourcePage: window.location.pathname })}
          className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
        >
          <WhatsAppIcon className="text-terracotta" size={22} />
          <div>
            <p className="text-sm font-semibold text-maroon-dark">WhatsApp — fastest reply</p>
            <p className="text-sm text-charcoal/70">{whatsappNumber}</p>
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
          <WhatsAppIcon className="text-terracotta" size={22} />
          <div>
            <p className="text-sm font-semibold text-maroon-dark">WhatsApp — fastest reply</p>
            <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
          </div>
        </div>
      )}

      {hasContactValue(email) ? (
        <a
          href={buildMailtoLink(email)}
          className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
        >
          <Mail className="text-terracotta" size={22} />
          <div>
            <p className="text-sm font-semibold text-maroon-dark">Email</p>
            <p className="text-sm text-charcoal/70">{email}</p>
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
          <Mail className="text-terracotta" size={22} />
          <div>
            <p className="text-sm font-semibold text-maroon-dark">Email</p>
            <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
          </div>
        </div>
      )}

      {hasContactValue(phone) ? (
        <a
          href={buildTelLink(phone)}
          onClick={() => trackCallClick(window.location.pathname)}
          className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4 transition-shadow hover:shadow-md"
        >
          <Phone className="text-terracotta" size={22} />
          <div>
            <p className="text-sm font-semibold text-maroon-dark">Call</p>
            <p className="text-sm text-charcoal/70">{phone}</p>
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-maroon/10 bg-white/60 p-4">
          <Phone className="text-terracotta" size={22} />
          <div>
            <p className="text-sm font-semibold text-maroon-dark">Call</p>
            <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
          </div>
        </div>
      )}
    </>
  );
}
