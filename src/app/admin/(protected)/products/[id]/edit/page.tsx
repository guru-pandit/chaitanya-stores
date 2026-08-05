"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { useProduct } from "@/hooks/products/useProduct";
import { useUpdateProduct } from "@/hooks/products/useProductMutations";
import { ApiError } from "@/lib/api-client";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const { mutate, isPending, error } = useUpdateProduct(id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl text-maroon-dark">Edit Product</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        {isLoading ? (
          <FormSkeleton fields={7} />
        ) : !product ? (
          <EmptyState
            title="Product not found"
            description="It may have been deleted, or the link is incorrect."
            action={
              <LinkButton href="/admin/products" variant="primary" className="mt-2">
                Back to Products
              </LinkButton>
            }
          />
        ) : (
          <ProductForm
            product={product}
            onSubmit={(values) =>
              mutate(values, {
                onSuccess: () => {
                  toast.success("Product updated");
                  router.push("/admin/products");
                },
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Failed to update product"),
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
