"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

const DISMISSED_KEY = "dismissedFestivalBannerId";
const FADE_DURATION_MS = 300;

// Server-fetched banner data comes in as a prop (see (site)/layout.tsx) —
// this component only handles the client-only "has this exact banner
// already been dismissed" check and the modal's open/close UI, no fetching.
export function FestivalBannerModal({
  banner,
}: {
  banner: { id: string; label: string; mediaType: "IMAGE" | "VIDEO"; mediaPath: string } | null;
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!banner) return;
    if (localStorage.getItem(DISMISSED_KEY) === banner.id) return;
    // Mount closed, then flip to open on the next frame so the opacity
    // transition actually animates instead of snapping straight to visible.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [banner]);

  // Cancel the close()-triggered unmount timer if the component itself goes
  // away first (e.g. the visitor navigates to another page within the
  // 300ms fade-out) — otherwise it fires a state update on an unmounted
  // component.
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  if (!banner || dismissed) return null;

  function close() {
    if (!banner) return;
    // Fading out via opacity/pointer-events alone leaves the <video>
    // element mounted and still playing — audible even though invisible if
    // the visitor had unmuted it. Pause immediately so sound stops the
    // instant they close it, then unmount once the fade-out finishes.
    videoRef.current?.pause();
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, banner.id);
    dismissTimeoutRef.current = setTimeout(() => setDismissed(true), FADE_DURATION_MS);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        visible ? "opacity-100 pointer-events-auto" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="absolute inset-0 bg-charcoal/70" onClick={close} />
      <div className="relative">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 text-charcoal shadow-md hover:bg-cream-dark"
        >
          <X size={18} />
        </button>
        {banner.mediaType === "VIDEO" ? (
          <video
            ref={videoRef}
            src={banner.mediaPath}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-xl"
          />
        ) : (
          <Image
            src={banner.mediaPath}
            alt={banner.label}
            width={800}
            height={800}
            className="max-h-[80vh] max-w-[90vw] w-auto h-auto rounded-2xl object-contain shadow-xl"
          />
        )}
      </div>
    </div>
  );
}
