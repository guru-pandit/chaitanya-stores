"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { buildWhatsappLink } from "@/lib/site-config";

// Persistent mobile-only WhatsApp shortcut. Uses the same wa.me link builder
// as every other enquiry surface — no new logic, just an always-reachable
// entry point on small screens. Hidden on the product detail route, which
// already carries the fuller StickyEnquiryBar (WhatsApp + Call + Email) and
// would otherwise stack two floating elements in the same corner.
export function WhatsAppFab({ whatsappNumber }: { whatsappNumber: string }) {
  const pathname = usePathname();
  const onProductDetail = pathname.startsWith("/catalog/") && pathname !== "/catalog";
  if (onProductDetail) return null;

  return (
    <a
      href={buildWhatsappLink(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Enquire on WhatsApp"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-cream shadow-lg transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none sm:hidden"
    >
      <MessageCircle size={26} aria-hidden="true" />
    </a>
  );
}
