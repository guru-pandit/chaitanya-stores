"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { useToastStore, type Toast } from "@/store/toastStore";

const AUTO_DISMISS_MS = 4000;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const id = setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [toast.id, removeToast]);

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
