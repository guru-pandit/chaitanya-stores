"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { buildWhatsappLink, CONTACT_COMING_SOON, hasContactValue } from "@/lib/site-config";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/form/TextField";
import { TextareaField } from "@/components/ui/form/TextareaField";
import { toast } from "@/lib/toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useApiFormErrors } from "@/hooks/useApiFormErrors";

export function ContactForm({ whatsappNumber }: { whatsappNumber?: string }) {
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const formError = useApiFormErrors<ContactInput>(submitError, setError);

  async function onSubmit(values: ContactInput) {
    setSubmitError(null);
    try {
      await apiFetch("/api/contact", { method: "POST", body: JSON.stringify(values) });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err);
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-maroon/10 bg-cream-dark/30 p-6 text-center">
        <p className="font-display text-lg text-maroon-dark">Thanks — we&apos;ll get back to you soon.</p>
        <p className="mt-2 text-sm text-charcoal/70">
          We reply personally to every message. If it&apos;s urgent, reach us directly instead.
        </p>
        {hasContactValue(whatsappNumber) ? (
          <a
            href={buildWhatsappLink(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
          >
            <MessageCircle size={16} /> Message us on WhatsApp
          </a>
        ) : (
          <p className="mt-4 text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
        )}
      </div>
    );
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
        placeholder="Let us know the product, brand, and quantity you're looking for."
        error={errors.message?.message}
        {...register("message")}
      />

      {/* Honeypot: invisible to real visitors, likely to be autofilled by a
          naive bot script. sr-only (not display:none) + aria-hidden +
          tabIndex={-1} + autoComplete="off" keeps it out of the visual
          layout, the tab order, and assistive tech, without a submit-time
          error being shown to a bot (handled server-side instead). */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Company</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <Button type="submit" loading={isSubmitting} variant="primary" className="w-full">
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
