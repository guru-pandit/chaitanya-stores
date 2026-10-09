"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { gtmPageView } from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

// Fires a virtual pageview on every client-side route change (App Router
// navigations don't trigger a real page load, so GTM's own history-based
// triggers can't see them). Split out from Analytics so useSearchParams()
// — which opts the whole subtree out of static rendering — only affects
// this leaf, not the <script> tags around it.
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GTM_ID) return;
    const query = searchParams.toString();
    gtmPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

// Public site only — mounted from (site)/layout.tsx, never the root layout,
// so admin dashboard usage (the shop owner's own clicks) is never tracked.
export function Analytics() {
  return (
    <>
      {GTM_ID && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${CLARITY_ID}');`}
        </Script>
      )}
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}

// Rendered at the very top of <body> (via (site)/layout.tsx) — GTM's
// documented noscript fallback for users with JS disabled.
export function GtmNoScript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
