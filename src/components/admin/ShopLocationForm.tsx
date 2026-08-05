"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopLocationSchema, type ShopLocationInput } from "@/lib/validations/shopLocation";
import { useApiFormErrors } from "@/hooks/useApiFormErrors";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/form/TextField";
import { TextareaField } from "@/components/ui/form/TextareaField";
import { CheckboxField } from "@/components/ui/form/CheckboxField";
import type { ShopLocation } from "@/generated/prisma/client";

export function ShopLocationForm({
  shopLocation,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  shopLocation?: ShopLocation;
  onSubmit: (values: ShopLocationInput) => void;
  isSubmitting: boolean;
  submitError?: unknown;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ShopLocationInput>({
    resolver: zodResolver(shopLocationSchema),
    defaultValues: shopLocation
      ? {
          name: shopLocation.name,
          address: shopLocation.address,
          phone: shopLocation.phone,
          whatsappNumber: shopLocation.whatsappNumber,
          email: shopLocation.email,
          isPrimary: shopLocation.isPrimary,
        }
      : {
          name: "",
          address: "",
          phone: "",
          whatsappNumber: "",
          email: "",
          isPrimary: false,
        },
  });

  const formError = useApiFormErrors<ShopLocationInput>(submitError, setError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <TextField
        id="name"
        label="Name"
        required
        error={errors.name?.message}
        placeholder="e.g. Main Branch"
        {...register("name")}
      />

      <TextareaField
        id="address"
        label="Address"
        required
        rows={3}
        error={errors.address?.message}
        {...register("address")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="phone"
          label="Phone"
          required
          error={errors.phone?.message}
          placeholder="+919999999999"
          {...register("phone")}
        />
        <TextField
          id="whatsappNumber"
          label="WhatsApp Number"
          required
          error={errors.whatsappNumber?.message}
          placeholder="919999999999"
          {...register("whatsappNumber")}
        />
      </div>

      <TextField
        id="email"
        label="Email"
        required
        error={errors.email?.message}
        {...register("email")}
      />

      <Controller
        control={control}
        name="isPrimary"
        render={({ field }) => (
          <CheckboxField
            label="Set as primary location"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        )}
      />

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting} variant="primary">
          {isSubmitting ? "Saving..." : shopLocation ? "Save Changes" : "Add Location"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/shop-locations")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
