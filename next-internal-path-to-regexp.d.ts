// Minimal ambient type for Next's own bundled path-matching engine, used
// only by next.config.test.ts to prove the actual per-segment redirect
// matching behavior against a real matcher rather than a hand-rolled
// assumption. This module ships compiled JS with no declaration file, which
// otherwise fails `tsc --noEmit` under this project's strict settings
// (TS7016). Deliberately typed narrowly to just the one export/shape the
// test actually uses — not a full type definition of the library.
declare module "next/dist/compiled/path-to-regexp" {
  export function pathToRegexp(path: string): { test(input: string): boolean };
}
