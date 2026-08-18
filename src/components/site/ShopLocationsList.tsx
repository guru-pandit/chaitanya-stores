import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { hasContactValue } from "@/lib/site-config";
import type { ShopLocation } from "@/generated/prisma/client";

// Plain-text list of shop locations (address/phone/email) — used for
// non-primary locations on the Contact and About pages. The primary
// location gets the full WhatsApp/Email/Call action buttons elsewhere
// (EnquiryActions); these are informational only, not action buttons.
export function ShopLocationsList({ locations }: { locations: ShopLocation[] }) {
  if (locations.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {locations.map((location) => (
        <div key={location.id} className="rounded-xl border border-maroon/10 bg-white/60 p-4">
          <p className="text-sm font-semibold text-maroon-dark">{location.name}</p>
          <div className="mt-2 space-y-1.5 text-sm text-charcoal/70">
            <p className="flex items-start gap-1.5">
              <MapPin size={14} className="mt-0.5 shrink-0 text-terracotta" /> {location.address}
            </p>
            {hasContactValue(location.mapLink) && (
              <a
                href={location.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-terracotta"
              >
                <ExternalLink size={14} className="shrink-0 text-terracotta" /> View on Map
              </a>
            )}
            <a
              href={`tel:${location.phone}`}
              className="flex items-center gap-1.5 hover:text-terracotta"
            >
              <Phone size={14} className="shrink-0 text-terracotta" /> {location.phone}
            </a>
            <a
              href={`mailto:${location.email}`}
              className="flex items-center gap-1.5 hover:text-terracotta"
            >
              <Mail size={14} className="shrink-0 text-terracotta" /> {location.email}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
