"use client";

import { useRouter } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { useCreateCategory } from "@/hooks/categories/useCategoryMutations";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export default function NewCategoryPage() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateCategory();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-maroon-dark">New Category</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        <CategoryForm
          onSubmit={(values) =>
            mutate(values, {
              onSuccess: () => {
                toast.success("Category created");
                router.push("/admin/categories");
              },
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Failed to create category"),
            })
          }
          isSubmitting={isPending}
          submitError={error}
        />
      </div>
    </div>
  );
}
