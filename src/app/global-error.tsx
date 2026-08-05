"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";
import "./globals.css";

// Next requires this file to catch errors thrown by the root layout itself
// (src/app/layout.tsx) — the (site)/error.tsx and admin/(protected)/error.tsx
// boundaries only cover errors below the root layout, not in it. Renders its
// own <html>/<body> since it replaces the whole root layout when triggered;
// kept deliberately minimal — no fonts, no providers, nothing that could
// itself fail here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center text-charcoal">
        <h1 className="text-2xl font-semibold text-maroon-dark">Something Went Wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-charcoal/70">
          We hit a snag loading the site. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-cream"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
