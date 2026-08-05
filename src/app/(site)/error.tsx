"use client";

import { useEffect } from "react";
import { MandalaDivider } from "@/components/site/MandalaDivider";
import { Button, LinkButton } from "@/components/ui/Button";
import { reportClientError } from "@/lib/reportClientError";

export default function SiteError({
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
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl text-maroon-dark">Something Went Wrong</h1>
      <MandalaDivider className="my-6" />
      <p className="text-charcoal/70">
        We hit a snag loading this page. Please try again, or head back home.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button type="button" variant="primary" onClick={reset}>
          Try Again
        </Button>
        <LinkButton href="/" variant="ghost">
          Back to Home
        </LinkButton>
      </div>
    </div>
  );
}
