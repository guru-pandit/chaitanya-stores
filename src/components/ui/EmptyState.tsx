import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-maroon/20 bg-cream-dark/40 px-6 py-16 text-center">
      <p className="font-display text-xl text-maroon">{title}</p>
      {description && <p className="max-w-sm text-sm text-charcoal/70">{description}</p>}
      {action}
    </div>
  );
}
