import { useEffect } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-client";

// Maps a mutation's ApiError.fieldErrors onto react-hook-form fields, so a
// server-side error (Zod validation, or a hand-built conflict like "Slug
// already in use") renders inline under the same field as a client-side
// Zod error, instead of one generic message below the whole form. Returns
// the message to show as a form-level fallback — only when the error isn't
// tied to any specific field (a network failure, or a true top-level issue).
export function useApiFormErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): string | null {
  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors;

  useEffect(() => {
    if (!fieldErrors) return;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        setError(field as Path<T>, { type: "server", message: messages[0] });
      }
    }
  }, [fieldErrors, setError]);

  if (!apiError) return null;
  return fieldErrors && Object.keys(fieldErrors).length > 0 ? null : apiError.message;
}
