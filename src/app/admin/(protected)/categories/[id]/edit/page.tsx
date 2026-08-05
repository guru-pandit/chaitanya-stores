"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { useCategory } from "@/hooks/categories/useCategory";
import { useUpdateCategory } from "@/hooks/categories/useCategoryMutations";
import { ApiError } from "@/lib/api-client";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: category, isLoading } = useCategory(id);
  const { mutate, isPending, error } = useUpdateCategory(id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-maroon-dark">Edit Category</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        {isLoading ? (
          <FormSkeleton fields={3} />
        ) : !category ? (
          <EmptyState
            title="Category not found"
            description="It may have been deleted, or the link is incorrect."
            action={
              <LinkButton href="/admin/categories" variant="primary" className="mt-2">
                Back to Categories
              </LinkButton>
            }
          />
        ) : (
          <CategoryForm
            category={category}
            onSubmit={(values) =>
              mutate(values, {
                onSuccess: () => {
                  toast.success("Category updated");
                  router.push("/admin/categories");
                },
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Failed to update category"),
              })
            }
            isSubmitting={isPending}
            submitError={error}
          />
        )}
      </div>
    </div>
  );
}
