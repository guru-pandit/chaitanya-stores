import Link from "next/link";
import { Pencil, Trash2, Loader2 } from "lucide-react";

export function RowActions({
  editHref,
  label,
  onDelete,
  deleting,
  deleteDisabledReason,
}: {
  editHref: string;
  label: string;
  onDelete: () => void;
  deleting?: boolean;
  deleteDisabledReason?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Link
        href={editHref}
        className="rounded-full p-2 text-maroon hover:bg-maroon/5"
        aria-label={`Edit ${label}`}
      >
        <Pencil size={16} />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting || !!deleteDisabledReason}
        title={deleteDisabledReason}
        className="rounded-full p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
        aria-label={`Delete ${label}`}
      >
        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>
    </div>
  );
}
