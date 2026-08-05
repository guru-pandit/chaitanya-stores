// Same `{ fieldErrors: Record<string, string[]> }` shape Zod's `flatten()`
// produces, for hand-built errors (uniqueness conflicts, business-rule
// checks) that aren't a schema validation failure but are still about one
// specific field — so the client can render them under that field via
// useApiFormErrors instead of as a generic message.
export function fieldError(field: string, message: string) {
  return { error: { fieldErrors: { [field]: [message] } } };
}
