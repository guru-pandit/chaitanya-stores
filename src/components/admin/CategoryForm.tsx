"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryInput } from "@/lib/validations/category";
import { slugify } from "@/lib/format";
import { useApiFormErrors } from "@/hooks/useApiFormErrors";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/form/TextField";
import { TextareaField } from "@/components/ui/form/TextareaField";
import type { Category } from "@/generated/prisma/client";

export function CategoryForm({
  category,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  category?: Category;
  onSubmit: (values: CategoryInput) => void;
  isSubmitting: boolean;
  submitError?: unknown;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          image: category.image ?? "",
        }
      : { name: "", slug: "", description: "", image: "" },
  });

  const name = watch("name");
  useEffect(() => {
    if (!category && name) setValue("slug", slugify(name));
  }, [name, category, setValue]);

  const formError = useApiFormErrors<CategoryInput>(submitError, setError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <TextField
        id="name"
        label="Name"
        required
        error={errors.name?.message}
        {...register("name")}
      />

      <TextField
        id="slug"
        label="Slug"
        required
        error={errors.slug?.message}
        {...register("slug")}
      />

      <TextareaField
        id="description"
        label="Description"
        rows={3}
        {...register("description")}
      />

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting} variant="primary">
          {isSubmitting ? "Saving..." : category ? "Save Changes" : "Create Category"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/categories")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
