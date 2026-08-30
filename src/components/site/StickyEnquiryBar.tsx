import { MessageCircle, Phone, Mail } from "lucide-react";
import {
  buildMailtoLink,
  buildTelLink,
  buildWhatsappLink,
  hasContactValue,
} from "@/lib/site-config";

// Mobile-only fixed bar pinned to the bottom of the product detail page so a
// visitor can enquire without scrolling back to the inline EnquiryActions
// block. Same wa.me/tel/mailto links as EnquiryActions (built from the
// primary shop location) — no new business logic, purely a second surface
// for the existing enquiry actions. Server Component: no interactivity.
export function StickyEnquiryBar({
  productName,
  whatsappNumber,
  email,
  phone,
}: {
  productName: string;
  whatsappNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  // One action takes the wide, labelled primary slot (WhatsApp first, then
  // Call, then Email); any others sit alongside as icon-only buttons.
  const primary = hasContactValue(whatsappNumber)
    ? {
        Icon: MessageCircle,
        href: buildWhatsappLink(whatsappNumber, productName),
        label: "Enquire on WhatsApp",
        external: true,
        slot: "whatsapp" as const,
      }
    : hasContactValue(phone)
      ? {
          Icon: Phone,
          href: buildTelLink(phone),
          label: "Call the shop",
          external: false,
          slot: "phone" as const,
        }
      : hasContactValue(email)
        ? {
            Icon: Mail,
            href: buildMailtoLink(email, productName),
            label: "Email the shop",
            external: false,
            slot: "email" as const,
          }
        : null;

  // Nothing to link to yet — the inline block already shows the
  // "coming soon" note, so this bar just stays out of the way.
  if (!primary) return null;

  const { Icon } = primary;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-maroon/15 bg-cream/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <a
          href={primary.href}
          {...(primary.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-terracotta px-4 py-3 text-sm font-semibold text-cream transition-colors hover:bg-terracotta-dark"
        >
          <Icon size={18} aria-hidden="true" /> {primary.label}
        </a>

        {primary.slot !== "phone" && hasContactValue(phone) && (
          <a
            href={buildTelLink(phone)}
            aria-label="Call the shop"
            className="flex shrink-0 items-center justify-center rounded-full border border-maroon/30 p-3 text-maroon transition-colors hover:bg-maroon/5"
          >
            <Phone size={18} aria-hidden="true" />
          </a>
        )}
        {primary.slot !== "email" && hasContactValue(email) && (
          <a
            href={buildMailtoLink(email, productName)}
            aria-label="Email the shop"
            className="flex shrink-0 items-center justify-center rounded-full border border-maroon/30 p-3 text-maroon transition-colors hover:bg-maroon/5"
          >
            <Mail size={18} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
