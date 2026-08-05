"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { useCreateProduct } from "@/hooks/products/useProductMutations";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

export default function NewProductPage() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateProduct();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl text-maroon-dark">New Product</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        <ProductForm
          onSubmit={(values) =>
            mutate(values, {
              onSuccess: () => {
                toast.success("Product created");
                router.push("/admin/products");
              },
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Failed to create product"),
            })
          }
          isSubmitting={isPending}
          submitError={error}
        />
      </div>
    </div>
  );
}
