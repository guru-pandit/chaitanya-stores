# Kokanvedh — Website Content & SEO Audit

**Date:** 2026-10-31
**Site:** https://kokanvedh.com (rebranded from Chaitanya Stores)
**Method:** Crawled every URL in `sitemap.xml` (178 pages: 4 static, 8 categories, 166 products), checked titles, meta
descriptions, canonicals, H1s, Open Graph, JSON-LD, status codes and the visible copy; reviewed the page source for all
static text; checked response headers, redirects, icons and the manifest. Read-only — nothing on the live site was changed.

## Summary

| Area | Result |
|---|---|
| Pages crawled | 178, all return 200 |
| Old brand "Chaitanya Stores" in page text | **0** (code clean) |
| Canonical URL, one H1, JSON-LD, Open Graph image | Present on all 178 |
| Duplicate titles | 0 |
| Redirects (old domain, `.in`, `.online`, `www`, `http`) | Correct 301s, path preserved |
| Security headers (HSTS, CSP, nosniff, X-Frame, Referrer, Permissions) | Present |
| Unknown URL | Returns a real 404 |
| **Meta description missing** | **166/166 products and 7/8 categories — fixed in this hotfix** |
| Startup-inappropriate claim on About page | **Fixed in this hotfix** |

## Fixed in this hotfix (`hotfix/kokanvedh-copy`)

| # | Finding | Fix |
|---|---|---|
| 1 | About page said Kokanvedh "opened in Sangameshwar about two years ago… What started as a small shop has grown into a catalog". Untrue for a new business. | Rewritten: "Kokanvedh is a new pooja samagri shop in Sangameshwar… We're just getting started and building our range step by step". The meta description now says "a new pooja samagri shop" instead of "a retail pooja samagri shop". |
| 2 | **Product and category pages had no meta description.** The code fell back to a generated sentence only when the description was `null`, but empty descriptions are stored as `""`, so no description was emitted. Google was showing random page text as the snippet for 173 pages. | Fallback now also applies to empty or whitespace-only values (`product.description?.trim() \|\| …`, same for categories). A regression test covers `""`, `"   "` and a real description. |

Takes effect after the hotfix is merged to `main` and deployed.

## Open — needs your decision or content

| Priority | Finding | Recommendation |
|---|---|---|
| High | **Shop name "Chaitanya Sugandhalay"** still appears on home, `/contact`, `/catalog` and `/about` (stored in Shop Locations, not in code). | You decided to keep it for now. When ready: Admin → Shop Locations → Edit. Until then the site shows two different business names (Kokanvedh and Chaitanya Sugandhalay), which can confuse visitors and weakens local SEO and Google Business matching. |
| High | A second contact email, `ssambekar.04@gmail.com`, is public on the site (second shop location). | Confirm this is intended to be public. A shared business address such as `contact.kokanvedh@gmail.com` is safer and more professional. |
| Medium | 7 of 8 **categories have no description** (so they use the generic fallback line) and two category pages have under 150 words of text. | Write a 2–3 sentence description per category in Admin → Categories (what it is, who it suits, which occasion). It improves the search snippet and the page's usefulness. |
| Medium | Product descriptions are mostly empty. Product pages carry only name, brand, weight and price — about 190 words each, much of it shared boilerplate. | Add a short description per product (fragrance, pack size, typical use). Start with the featured and best-selling items. |
| Medium | 9 product titles exceed 60 characters and will be cut off in Google (e.g. `/catalog/dhoop-cup-satya-vastu-shuddhi-gugal-premium-sambrani-cup` — 64 characters). | Shorten the product names in Admin, or drop the brand from the title pattern for long names. |
| Medium | Brand name repeated for "trusted brands" in ~8 places (home eyebrow, hero text, "Why Shop", About, Catalog, meta descriptions, tagline). For a new shop the word "trusted" describes the *brands* correctly but reads like boilerplate when repeated. | Keep it in the metadata and in one visible place; vary the rest (e.g. "Satya, Janak, Manohar, Anil and Forest" by name, which is more convincing than the adjective). |
| Low | Social profile icons are not shown in the footer (no Instagram/Facebook URLs set). | Create the Kokanvedh profiles and set `NEXT_PUBLIC_INSTAGRAM_URL` / `NEXT_PUBLIC_FACEBOOK_URL` in GitHub secrets. Also adds `sameAs` links for Google. |
| Low | Product pages set `og:type` to `website` and `og:title` to the product name only (no brand/site). | Cosmetic. Social previews work; improve later if you want richer previews. |
| Low | 15 `<img>` tags on product pages and 5 on the home page have an empty `alt`. On the home page these are the decorative hero slideshow images, which is acceptable. I did not inspect the 15 on product pages one by one. | Check that gallery thumbnails carry the product name; empty alt is fine only for purely decorative images. |
| Low | Site is English only. Local customers in Sangameshwar likely search in Marathi/Hindi (e.g. "अगरबत्ती", "पूजा साहित्य"). | Consider Marathi names or a short Marathi line on the home and About pages. Your logo is already in Devanagari. |
| Info | Unknown product slugs return HTTP 200 with `noindex` (a documented Next.js limitation in the code), while unknown top-level URLs return a real 404. | No action. |

## Copy review notes (static text)

- **Tone:** warm, plain and consistent. The "this is a catalog, not an online store" message is repeated on About, Contact and
  llms.txt — good for managing expectations.
- **Claims to keep true:** "stocked and sold through authorised channels", "we reply personally to every enquiry",
  "every order is confirmed by us before you visit", "bulk festival quantities welcome". Remove any that you cannot keep as
  a young business.
- **Location wording:** "Sangameshwar" appears in titles of the home, catalog, about and contact pages — good for local search.
  If you plan to serve other Konkan towns, add them in the About and Catalog copy later.
- **Headings:** each page has exactly one H1. Home H1 "Agarbatti, Dhoop & Pooja Samagri in Sangameshwar" matches the title.

## What is healthy

- Redirects: `kokanvedh.in`, `kokanvedh.online`, `chaitanyastores.com` and `www` variants all 301 to `https://kokanvedh.com` and keep the path.
- `robots.txt` blocks `/admin/` and points at the new sitemap; the sitemap lists 178 URLs, all 200.
- Manifest name is "Kokanvedh"; favicon, `icon.png`, `apple-icon.png` and `logo.png` all serve 200 with the new logo.
- JSON-LD `Store` uses the new name and URL. GTM is present.
- Security headers present: HSTS (preload), CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy.

## Not covered

Page speed and Core Web Vitals, accessibility testing with a screen reader, the admin dashboard, form submission, and Google
Search Console data (too early after the move). Run `/e2e-qa` for the interactive flows.
