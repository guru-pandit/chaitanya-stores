import Image, { type ImageProps } from "next/image";

// Wraps next/image with `unoptimized` hardcoded. Every uploaded file lives
// at a bare /uploads/... path that nginx serves directly, bypassing Node
// entirely (see nginx/templates/default.conf.template's /uploads/ location
// block, and README's deployment diagram) — next/image's built-in
// optimizer instead tries to fetch the source from the app's own server
// first, which fails for a path Node never routes, surfacing as "received
// null". nginx already serves these files with long-lived immutable cache
// headers, so the optimizer adds no value here anyway.
//
// Use this, not next/image directly, for any <Image> whose src is a
// Product/FestivalBanner/SiteSettings/Category upload path — that
// invariant used to be duplicated at every call site with nothing
// enforcing it; this is the one place it needs to be remembered now.
// `alt` is spread in via props and required by ImageProps' type — the
// lint rule below just can't see through the spread to confirm that.
export function UploadedImage(props: ImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} unoptimized />;
}
