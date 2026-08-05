"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
          <Image
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
          what keeps headline/body legible regardless of what's underneath. */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream/45 via-cream/60 to-cream" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_38%,_var(--color-cream)_0%,_transparent_72%)] opacity-80" />
    </div>
  );
}
