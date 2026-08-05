import { MessageCircle, Mail, Phone } from "lucide-react";
import { buildMailtoLink, buildTelLink, buildWhatsappLink } from "@/lib/site-config";

export function EnquiryActions({
  whatsappNumber,
  email,
  phone,
  productName,
  className = "",
  onDark = false,
}: {
  whatsappNumber: string;
  email: string;
  phone: string;
  productName?: string;
  className?: string;
  onDark?: boolean;
}) {
  const callClasses = onDark
    ? "border border-cream/40 text-cream hover:bg-cream/10"
    : "border border-maroon/30 text-maroon hover:bg-maroon/5";

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a
        href={buildWhatsappLink(whatsappNumber, productName)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
      >
        <MessageCircle size={16} /> WhatsApp
      </a>
      <a
        href={buildMailtoLink(email, productName)}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
          onDark ? "bg-gold text-maroon-dark hover:bg-gold-light" : "bg-maroon text-cream hover:bg-maroon-dark"
        }`}
      >
        <Mail size={16} /> Email
      </a>
      <a
        href={buildTelLink(phone)}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${callClasses}`}
      >
        <Phone size={16} /> Call
      </a>
    </div>
  );
}
