"use client";

import { useEffect, useRef } from "react";
import { useDialogStore } from "@/store/dialogStore";
import { Button } from "@/components/ui/Button";

export function ConfirmDialogHost() {
  const dialog = useDialogStore((s) => s.dialog);
  const close = useDialogStore((s) => s.close);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dialog) return;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dialog, close]);

  if (!dialog) return null;

  const isAlert = dialog.type === "alert";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
      onClick={() => close(false)}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-maroon/10 bg-cream p-5 shadow-xl outline-none"
      >
        <h2 id="dialog-title" className="font-display text-lg font-semibold text-maroon">
          {dialog.title}
        </h2>
        <p id="dialog-message" className="mt-2 text-sm text-charcoal">
          {dialog.message}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          {!isAlert && (
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {dialog.cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            variant={dialog.tone === "danger" ? "secondary" : "primary"}
            onClick={() => close(true)}
          >
            {dialog.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
