// `fieldErrors` carries the per-field breakdown from a Zod `flatten()` error
// (or an equivalent shape a route builds by hand, e.g. a 409 slug conflict)
// so callers can show each message under its own form field instead of one
// generic message below the whole form — see useApiFormErrors.
export class ApiError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (typeof body?.error === "string") {
      throw new ApiError(body.error);
    }

    const fieldErrors: Record<string, string[]> | undefined = body?.error?.fieldErrors;
    const formErrors: string[] | undefined = body?.error?.formErrors;
    const firstFieldMessage = fieldErrors
      ? Object.values(fieldErrors).find((messages) => messages?.[0])?.[0]
      : undefined;
    const message = formErrors?.join(", ") || firstFieldMessage || "Something went wrong";

    throw new ApiError(message, fieldErrors);
  }

  return res.json();
}
