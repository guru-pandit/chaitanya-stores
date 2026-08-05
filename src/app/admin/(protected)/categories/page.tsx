"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCategories } from "@/hooks/categories/useCategories";
import { useDeleteCategory } from "@/hooks/categories/useCategoryMutations";
import { useDeleteWithConfirm } from "@/hooks/useDeleteWithConfirm";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { RowActions } from "@/components/admin/RowActions";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default function AdminCategoriesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCategories({ page, limit: PAGE_SIZE });
  const categories = data?.items;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const { mutate: deleteCategory, isPending } = useDeleteCategory();
  const { confirmDelete, pendingId } = useDeleteWithConfirm(deleteCategory);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-maroon-dark">Categories</h1>
        <LinkButton href="/admin/categories/new" variant="primary">
          <Plus size={16} /> New Category
        </LinkButton>
      </div>

      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70">
        {isLoading ? (
          <p className="p-6 text-sm text-charcoal/60">Loading...</p>
        ) : categories && categories.length > 0 ? (
          <>
            <ul className="divide-y divide-maroon/10">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium text-maroon-dark">{category.name}</p>
                    <p className="text-xs text-charcoal/50">
                      /{category.slug} · {category._count.products} product
                      {category._count.products === 1 ? "" : "s"}
                    </p>
                  </div>
                  <RowActions
                    editHref={`/admin/categories/${category.id}/edit`}
                    label={category.name}
                    onDelete={() => confirmDelete(category.id, category.name)}
                    deleting={isPending && pendingId === category.id}
                  />
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No categories yet"
              description="Create your first category to start organizing products."
              action={
                <LinkButton href="/admin/categories/new" variant="primary" className="mt-2">
                  <Plus size={16} /> New Category
                </LinkButton>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
