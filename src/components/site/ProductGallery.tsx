"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { UploadedImage } from "@/components/ui/UploadedImage";

// Below this, a horizontal drag reads as a tap or a vertical scroll rather
// than a deliberate swipe.
const SWIPE_THRESHOLD_PX = 40;

// Product detail gallery: main image + thumbnail strip, with a full-screen
// lightbox for inspecting pack details (fragrance, weight, batch text) that
// are unreadable at card size. Client component — the whole point is
// interaction; the product data itself still arrives from the Server
// Component that renders this.
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  /** Base alt text from the page (name + brand + shop); each image past the
   *  first is suffixed with its position so screen-reader users can tell
   *  them apart instead of hearing the same string N times. */
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const count = images.length;
  const hasMultiple = count > 1;

  function altFor(i: number) {
    return count > 1 ? `${alt} — image ${i + 1} of ${count}` : alt;
  }

  const showNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  const showPrevious = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Escape/arrow handling lives on the document rather than the dialog node
  // so it works no matter where focus currently sits inside the overlay.
  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (!hasMultiple) return;
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrevious();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, hasMultiple, closeLightbox, showNext, showPrevious]);

  // The page behind a full-screen overlay must not scroll away under it.
  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  // Move focus into the overlay on open and hand it back to whatever opened
  // it on close — otherwise a keyboard user lands back at the top of the
  // document and has to tab all the way down again.
  useEffect(() => {
    if (lightboxOpen) {
      openerRef.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus();
    } else {
      openerRef.current?.focus();
      openerRef.current = null;
    }
  }, [lightboxOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null || !hasMultiple) return;

    const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (deltaX < 0) showNext();
    else showPrevious();
  }

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-cream-dark text-charcoal/40">
        No image yet
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label={`${alt} — open full screen`}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-cream-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
      >
        <UploadedImage
          key={images[index]}
          src={images[index]}
          alt={altFor(index)}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-charcoal/60 px-3 py-1.5 text-xs font-medium text-cream opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn size={14} aria-hidden="true" /> Tap to zoom
        </span>
      </button>

      {hasMultiple && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === index}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 ${
                  i === index
                    ? "border-terracotta"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <UploadedImage src={src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} — image viewer`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/90 p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Backdrop click closes (same pattern as FestivalBannerModal). A
              plain div, not a button: it would otherwise be a second control
              announcing the same "Close image viewer" name as the real one,
              and keyboard users already have Escape and the close button. */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={closeLightbox} />

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeLightbox}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-10 rounded-full bg-cream/90 p-2 text-charcoal transition-colors hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X size={20} />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Previous image"
                className="absolute left-2 z-10 rounded-full bg-cream/90 p-2 text-charcoal transition-colors hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:left-6"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label="Next image"
                className="absolute right-2 z-10 rounded-full bg-cream/90 p-2 text-charcoal transition-colors hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:right-6"
              >
                <ChevronRight size={22} />
              </button>
              <p className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-charcoal/70 px-3 py-1 text-xs font-medium text-cream">
                {index + 1} / {count}
              </p>
            </>
          )}

          {/* object-contain, not cover — the whole point of the lightbox is
              seeing the full pack, uncropped. */}
          <UploadedImage
            key={images[index]}
            src={images[index]}
            alt={altFor(index)}
            width={1200}
            height={1200}
            className="pointer-events-none relative h-auto max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
