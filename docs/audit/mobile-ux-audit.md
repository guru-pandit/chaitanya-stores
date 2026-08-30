# Mobile UI/UX Audit & Responsive Plan

Branch: `feature/mobile-responsive-ui` (off `develop`)
Scope: **public site only** (`src/app/(site)/**` + `src/components/site/**` + shared `src/components/ui/**`). Admin (`src/app/admin/**`) is explicitly out of scope — desktop-only, single operator.
Constraint: **no business-logic changes** — only markup structure, Tailwind classes, and small presentational client components. No Prisma, no data flow, no `site-config`, no auth, no schema.

Test viewports: 360×800 (baseline Android), 390×844 (iPhone 13/14), 414×896 (large phone). Tailwind `sm` = 640px is the mobile→desktop cutover.

---

## Audit findings

### A. Product cards (headline complaint) — `src/components/site/ProductCard.tsx`
On mobile the catalog/category/home grids are `grid-cols-2 gap-4`. At 360px each card is ~156px wide, ~124px after `p-4`.

| # | Issue | Effect on mobile |
|---|-------|------------------|
| A1 | Product name is `font-display text-lg` (18px serif) | Long names wrap to 3–4 lines; card heights go ragged, price row misaligns across the row |
| A2 | Meta line `text-xs uppercase tracking-wide` (`Category · Brand`) | Letter-spacing + caps forces an early wrap; often 2 lines |
| A3 | `p-4` (16px) padding on a 156px card | ~20% of card width is padding |
| A4 | `gap-4` (16px) grid gutter | Steals width that should go to the card |
| A5 | Price row `flex items-baseline justify-between` + weight/options text | On narrow cards the two values crowd or wrap |
| A6 | No line clamp on the name | Unbounded vertical growth |
| A7 | Badges `text-xs px-3 py-1` | Slightly oversized on a small card; fine but can tighten |

**Fix direction:** keep 2-up on mobile (as requested). `text-sm sm:text-base` name with `line-clamp-2`; meta `text-[11px] sm:text-xs` and drop tracking on mobile; `p-3 sm:p-4`; grid `gap-x-3 gap-y-6 sm:gap-4`; give the name a min-height so 1- and 2-line cards align. Mirror the changes in `ProductCardSkeleton.tsx`.

### B. Global chrome

| # | Component | Issue |
|---|-----------|-------|
| B1 | `MobileNavToggle.tsx` | Bare 24px icon, no padding → tap target ~24px (min should be 44px) |
| B2 | `MobileNavPanel.tsx` | No transition, no elevation/backdrop; overflows the fixed `h-16` header with no shadow so it reads as glued-on; tapping outside doesn't close (only `MobileNavAutoClose` on route change) |
| B3 | `Footer.tsx` social icons | 20px icons, `gap-4` — tap targets small and close together |
| B4 | `PaginationLinks.tsx` | `px-4 py-2` → ~34px tall controls; label "Previous/Next" + "Page x of y" can crowd at 360px |
| B5 | `Header.tsx` | Logo (28px) + `text-xl` wordmark + toggle fits, but no breathing room at 320px; acceptable, minor |

### C. Product detail — `src/app/(site)/catalog/[slug]/page.tsx`

| # | Issue |
|---|-------|
| C1 | "Available Options" is a 3-column `<table>` (`Weight/Qty · Price · Availability`) — cramped/overflows at ≤390px |
| C2 | `EnquiryActions` (`flex flex-wrap gap-3`) wraps 3 pills to 2 rows; pills are `py-2.5` (~40px). Fine but not thumb-optimal, and it's below the fold |
| C3 | No fast path to enquire without scrolling (core conversion mechanic) |
| C4 | `grid gap-10 sm:grid-cols-2` — `gap-10` (40px) vertical gap between gallery and details is large on mobile |

### D. Homepage — `src/app/(site)/page.tsx`

| # | Issue |
|---|-------|
| D1 | Hero `h1` is `text-4xl sm:text-5xl` (36px on mobile) — the long headline wraps to 4–5 lines and dominates the first screen |
| D2 | Eyebrow `text-sm ... tracking-[0.2em]` uppercase wraps awkwardly at 360px |
| D3 | Hero `min-h-[calc(100dvh-4rem)]` + tall text = content pushed well down; acceptable but tighten paddings |
| D4 | "Shop by Category" cards `p-6` — heavy padding on 2-up mobile cards |
| D5 | Section header rows `flex items-end justify-between` (`Featured Products` + `View all →`) — OK but verify at 360px |
| D6 | Featured grid inherits the ProductCard issues (A) |

### E. Catalog filters — `src/components/site/ProductFilters.tsx`
| # | Issue |
|---|-------|
| E1 | Stacks fine (`flex-col gap-3 sm:flex-row`), but search + 2 selects at `py-2.5` are ~40px; bump to 44px on mobile |
| E2 | Selects are full-width stacked — acceptable; could go 2-up (`grid-cols-2`) to save vertical space |

### F. Other pages
| # | Page | Issue |
|---|------|-------|
| F1 | `contact/page.tsx` | Contact-method cards + form stack fine; `gap-10` between columns is large on mobile; otherwise OK |
| F2 | `about/page.tsx` | Prose `max-w-3xl` reads fine; no changes expected beyond spacing check |
| F3 | `error.tsx` / `NotFoundContent.tsx` | `py-24` is heavy on mobile; button rows wrap OK |
| F4 | `FestivalBannerModal.tsx` | Close button at `-right-3 -top-3` risks clipping against the `p-4` viewport edge on very narrow screens — verify |
| F5 | `ShopLocationsList.tsx` / `FooterShopContacts.tsx` | Already handled (email break points); spacing check only |

### G. Cross-cutting
- **Tap targets:** standardize interactive controls to ≥44px on mobile (toggle, pagination, filter inputs, footer icons).
- **Horizontal overflow:** audit each page at 360px for any element forcing a scroll (candidates: variants table C1, hero eyebrow D2).
- **Typography rhythm:** headings are mostly `text-2xl sm:text-3xl` already — make the hero consistent with that pattern.
- No `line-clamp` usage anywhere yet — Tailwind v4 ships it built in, safe to use.

---

## Optional enhancements (approved)
1. **Sticky mobile enquiry bar** on product detail — fixed bottom bar, WhatsApp / Call / Email, reuses existing `site-config` link builders. Mobile only (`sm:hidden`).
2. **Responsive variants table** → stacked cards below `sm`.
3. **Nav panel polish** — fade/slide transition, tap-outside-to-close backdrop, bigger targets.
4. **Global WhatsApp FAB** — floating button on every public page on mobile. Suppressed on the product-detail route so it never stacks with the sticky enquiry bar (#1).

---

## Phased plan (one commit per phase, review gate after each)

### Phase 1 — Product card & product grids  ← headline fix
- `ProductCard.tsx`: responsive name size + `line-clamp-2` + min-height, meta text size/tracking, `p-3 sm:p-4`, price-row robustness, badge tighten.
- `ProductCardSkeleton.tsx`: match new metrics.
- Grid gutters on `catalog/page.tsx`, `categories/[slug]/page.tsx`, `page.tsx` (featured), and `catalog/loading.tsx`: `gap-x-3 gap-y-6 sm:gap-4`.
- Verify at 360 / 390 / 414.

### Phase 2 — Global chrome & tap targets
- `MobileNavToggle.tsx`: padding + `-m-2` so layout is unchanged, 44px target.
- `MobileNavPanel.tsx` + `MobileNavToggle` + store: fade/slide, backdrop tap-to-close, shadow. (Enhancement #3)
- `Footer.tsx`: social icon hit area.
- `PaginationLinks.tsx`: target size + label handling at 360px.

### Phase 3 — Product detail page
- Responsive variants table → cards below `sm` (Enhancement #2).
- Tighten `gap-10` → `gap-8 sm:gap-10`; spacing pass.
- `EnquiryActions`: full-width stack option on mobile for the detail page.
- Sticky mobile enquiry bar component (Enhancement #1).

### Phase 4 — Homepage
- Hero `h1` → `text-3xl sm:text-5xl` (or clamp), eyebrow wrapping fix, padding tighten.
- "Shop by Category" cards `p-4 sm:p-6`.
- Section-header rows verified at 360px.

### Phase 5 — Filters, contact, about, error/404, festival modal, FAB
- `ProductFilters.tsx`: 44px inputs, optional 2-up selects on mobile.
- `contact` / `about`: spacing pass at mobile.
- `error.tsx` / `NotFoundContent.tsx`: `py-16 sm:py-24`.
- `FestivalBannerModal.tsx`: close-button clip check.
- Global WhatsApp FAB (Enhancement #4), suppressed on `/catalog/[slug]`.

### Phase 6 — QA
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- Playwright viewport sweep (360 / 390 / 414) across home, catalog, category, product detail, contact, about, 404.
- Optionally `/e2e-qa`.
- Update this doc's checkboxes; `/ship` handoff.

---

## Progress
- [x] Phase 1 — Product card & grids
- [x] Phase 2 — Global chrome & tap targets
- [x] Phase 3 — Product detail
- [x] Phase 4 — Homepage
- [ ] Phase 5 — Filters, secondary pages, FAB
- [ ] Phase 6 — QA
