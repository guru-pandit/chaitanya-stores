import { MessageCircle, Mail, Phone } from "lucide-react";
import { buildMailtoLink, buildTelLink, buildWhatsappLink, CONTACT_COMING_SOON, hasContactValue } from "@/lib/site-config";

export function EnquiryActions({
  whatsappNumber,
  email,
  phone,
  productName,
  className = "",
  onDark = false,
}: {
  whatsappNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  productName?: string;
  className?: string;
  onDark?: boolean;
}) {
  const callClasses = onDark
    ? "border border-cream/40 text-cream hover:bg-cream/10"
    : "border border-maroon/30 text-maroon hover:bg-maroon/5";
  const noteClasses = onDark ? "text-cream/60" : "text-charcoal/50";

  const hasWhatsapp = hasContactValue(whatsappNumber);
  const hasEmail = hasContactValue(email);
  const hasPhone = hasContactValue(phone);

  // No ShopLocation configured yet and no env fallback set — never build a
  // wa.me/mailto/tel link from an empty value (see site-config.ts).
  if (!hasWhatsapp && !hasEmail && !hasPhone) {
    return <p className={`text-sm ${noteClasses} ${className}`}>{CONTACT_COMING_SOON}</p>;
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {hasWhatsapp ? (
        <a
          href={buildWhatsappLink(whatsappNumber, productName)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
      ) : null}
      {hasEmail ? (
        <a
          href={buildMailtoLink(email, productName)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
            onDark ? "bg-gold text-maroon-dark hover:bg-gold-light" : "bg-maroon text-cream hover:bg-maroon-dark"
          }`}
        >
          <Mail size={16} /> Email
        </a>
      ) : null}
      {hasPhone ? (
        <a
          href={buildTelLink(phone)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${callClasses}`}
        >
          <Phone size={16} /> Call
        </a>
      ) : null}
    </div>
  );
}
