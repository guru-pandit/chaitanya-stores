"use client";

import { useEffect, useState } from "react";
import { UploadedImage } from "@/components/ui/UploadedImage";

const SLIDE_DURATION_MS = 5000;

// Client island: only the crossfade timer needs 'use client'. Renders nothing
// (falls back to the plain gradient hero background) until real product
// photos exist — no placeholder/stock images are hardcoded here.
export function HeroSlideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <UploadedImage
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover ${i === index ? "animate-hero-zoom" : ""}`}
          />
        </div>
      ))}
      {/* Two-layer scrim: a top-to-bottom fade plus a soft spotlight behind the
          text block. Text color/weight here is tuned for a cream background —
          real photos vary wildly in color and darkness, so the spotlight is
          what keeps headline/body legible regardless of what's underneath.
          Symmetric and peaking at the centre, not maxing out at either edge:
          the section is now viewport-height with the content block
          vertically centered (see the (site)/page.tsx hero section), so the
          content — and the empty margin above and below it — sits
          differently on every screen height. Fading all the way to opaque
          cream at a fixed point (as this once did) assumed a short,
          bottom-anchored content block and painted a large flat,
          patternless band under it on taller screens; staying translucent at
          both edges keeps the photo (and sitewide backdrop) visible in
          whatever margin ends up above or below the text on a given
          viewport. */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream/35 via-cream/75 to-cream/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_38%,_var(--color-cream)_0%,_transparent_72%)] opacity-60" />
    </div>
  );
}
