// Forwards a browser-side error to the server log stream (see
// src/app/api/log-client-error/route.ts) — without this, error.tsx/
// global-error.tsx boundaries only ever reach the visitor's own browser
// console. Best-effort: a failure here must never throw on top of the error
// it's reporting, so every failure mode is swallowed.
export function reportClientError(error: Error & { digest?: string }) {
  try {
    const payload = JSON.stringify({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
    });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/log-client-error",
        new Blob([payload], { type: "application/json" })
      );
      if (sent) return;
    }

    void fetch("/api/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never itself throw.
  }
}
