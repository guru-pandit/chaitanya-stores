import { MapPin, Phone, Mail } from "lucide-react";
import { CONTACT_COMING_SOON, hasContactValue } from "@/lib/site-config";

// Dark-theme counterpart to ShopLocationsList (which is styled for the
// cream Contact/About pages) — same name/address/phone/email data, but
// tuned for the maroon footer. Kept as a separate component rather than a
// variant prop on ShopLocationsList: the two share no markup beyond the
// field order, and the footer version carries the "Main" badge and the
// per-shop CONTACT_COMING_SOON fallback that the page version doesn't need.
export type FooterShopContact = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isPrimary: boolean;
};

// Narrow footer cards can't fit a full email on one line, and breaking
// wherever the text happens to run out of room (break-words) lands mid-word
// in an ugly spot. Offering a break opportunity right after "@" and each "."
// instead makes the wrap fall on a natural boundary, e.g.
// "shop@" / "example.com" rather than "sh" / "op@example.co" / "m".
function emailWithBreakPoints(email: string) {
  const segments = email.split(/(?<=[@.])/);
  return segments.flatMap((segment, i) =>
    i === 0 ? [segment] : [<wbr key={i} />, segment]
  );
}

export function FooterShopContacts({ shops }: { shops: FooterShopContact[] }) {
  // With a single shop there's nothing to distinguish it from, so the badge
  // would just be noise.
  const showPrimaryBadge = shops.length > 1;

  return (
    <ul className="mt-3 flex flex-col gap-4">
      {shops.map((shop) => {
        // Every contact field is independently optional (a ShopLocation row
        // can be saved with blanks, and the siteConfig fallback's env-backed
        // fields are `""` when unset) — a shop with nothing usable still
        // needs to say so rather than render an empty card.
        const hasAnyContact =
          hasContactValue(shop.address) ||
          hasContactValue(shop.phone) ||
          hasContactValue(shop.email);

        return (
          <li key={shop.id} className="rounded-xl border border-cream/10 bg-cream/5 p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-cream">
              {shop.name}
              {showPrimaryBadge && shop.isPrimary && (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-light">
                  Main
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-cream/75">
              {hasContactValue(shop.address) && (
                <p className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                  <span>{shop.address}</span>
                </p>
              )}
              {hasContactValue(shop.phone) && (
                <a href={`tel:${shop.phone}`} className="flex items-center gap-2 hover:text-gold">
                  <Phone size={14} className="shrink-0 text-gold" aria-hidden="true" />
                  <span>{shop.phone}</span>
                </a>
              )}
              {hasContactValue(shop.email) && (
                <a
                  href={`mailto:${shop.email}`}
                  className="flex items-center gap-2 hover:text-gold"
                >
                  <Mail size={14} className="shrink-0 text-gold" aria-hidden="true" />
                  {/* min-w-0 is load-bearing: as a flex item this span defaults
                      to min-width:auto, which blocks shrinking (and therefore
                      wrapping) below its content's intrinsic width. break-words
                      is a fallback for the rare segment (between break points)
                      that's still too long on its own. */}
                  <span className="min-w-0 break-words">
                    {emailWithBreakPoints(shop.email)}
                  </span>
                </a>
              )}
              {!hasAnyContact && <p className="text-cream/60">{CONTACT_COMING_SOON}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
