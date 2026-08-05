import { NextRequest } from "next/server";
import type { ZodType } from "zod";

// `schema.safeParse(await req.json())` is the standard route-handler pattern
// (see api-conventions.md), but a syntactically invalid body throws a
// SyntaxError before safeParse ever runs, escaping as an unhandled 500.
// Every schema in this app is a z.object(), which safeParse rejects
// `undefined` against, so feeding it `undefined` on a parse failure turns a
// malformed body into an ordinary 400 — no new response shape needed.
export async function parseJsonBody<Schema extends ZodType>(
  req: NextRequest,
  schema: Schema
): Promise<ReturnType<Schema["safeParse"]>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }
  return schema.safeParse(body) as ReturnType<Schema["safeParse"]>;
}
