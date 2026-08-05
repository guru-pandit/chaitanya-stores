"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/form/TextField";
import { TextareaField } from "@/components/ui/form/TextareaField";
import { toast } from "@/lib/toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useApiFormErrors } from "@/hooks/useApiFormErrors";

export function ContactForm() {
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const formError = useApiFormErrors<ContactInput>(submitError, setError);

  async function onSubmit(values: ContactInput) {
    setSubmitError(null);
    try {
      await apiFetch("/api/contact", { method: "POST", body: JSON.stringify(values) });
      toast.success("Thanks — we'll get back to you soon.");
      reset();
    } catch (err) {
      setSubmitError(err);
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

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
        id="contactMethod"
        label="Phone or Email"
        required
        error={errors.contactMethod?.message}
        {...register("contactMethod")}
      />

      <TextareaField
        id="message"
        label="Message"
        rows={4}
        required
        error={errors.message?.message}
        {...register("message")}
      />

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <Button type="submit" loading={isSubmitting} variant="primary" className="w-full">
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
