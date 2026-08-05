"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { reportClientError } from "@/lib/reportClientError";

export default function AdminError({
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-maroon/10 bg-white/70 px-6 py-16 text-center">
      <h1 className="font-display text-xl text-maroon-dark">Something Went Wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-charcoal/70">
        This page ran into an error. Try again, or head back to the dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button type="button" variant="primary" onClick={reset}>
          Try Again
        </Button>
        <LinkButton href="/admin/dashboard" variant="ghost">
          Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
