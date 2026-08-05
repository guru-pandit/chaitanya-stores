# Design System

## Stack
Tailwind CSS only. No Bootstrap, no CSS-in-JS, no inline `style={{}}` except for truly dynamic values (e.g. a computed background image URL).

## Brand Palette
Traditional, warm, premium-artisanal — not a "tech SaaS" look. Configure as Tailwind theme tokens in `tailwind.config.ts`, never hard-coded hex values in components.

| Token | Role | Approx |
|-------|------|--------|
| `terracotta` | Primary brand color — CTAs, links, accents | warm burnt-orange |
| `maroon` | Deep secondary — headers, footer, high-emphasis text | deep red-brown |
| `gold` | Accent — highlights, featured badges, dividers | mustard/gold |
| `cream` | Background | warm off-white |
| `charcoal` | Body text | near-black, not pure `#000` |

Avoid stark white-and-blue "tech" combinations. Color is layered — cream backgrounds, maroon/terracotta for structure, gold used sparingly as accent, not as a base color.

## Typography
- Headings (brand name, section titles): a classic serif or elegant display font (e.g. a Google Font like "Playfair Display" or "Cormorant") — loaded via `next/font`
- Body text: clean sans-serif (e.g. "Inter" or "Work Sans") — loaded via `next/font`
- No more than two font families total
- Base body size 16px; use Tailwind's default type scale, don't invent one-off sizes

## Motifs
Subtle diya, lotus, or mandala-pattern accents as SVG dividers/section backgrounds — low-opacity, decorative, never competing with product photography or text for attention. Product photography quality matters more than decoration; motifs are seasoning, not the meal.

## Spacing & Breakpoints
Use Tailwind's default spacing scale (`p-1`…`p-24`) and default breakpoints (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px). Mobile-first: design and test at `sm` first — most Indian retail traffic is mobile.

## Component Map
| Need | Approach |
|------|----------|
| Buttons | Shared `<Button>` component with `variant` prop (`primary`/`secondary`/`ghost`) mapped to palette tokens |
| Product card | `<ProductCard>` — image, name, price/"contact for price", featured badge, WhatsApp/Email/Call actions |
| Enquiry actions | `<EnquiryActions productName={...} />` — reads from `src/lib/site-config.ts`, renders the three tappable links |
| Modal (admin) | Headless UI `Dialog` or a small custom component — no Bootstrap modal |
| Data table (admin) | `<DataTable>` (`src/components/ui/DataTable.tsx`) — generic columns config, used for lists with more than ~3 columns; a plain `<ul>` is still fine for short 1–2 line rows |
| Select / dropdown | `<Select>` (`src/components/ui/Select.tsx`) — never a bare `<select>`. Native select arrows sit flush against rounded/pill borders; this component hides the native arrow (`appearance-none`) and draws a `ChevronDown` with proper spacing instead |
| Form fields | `TextField` / `TextareaField` / `SelectField` / `CheckboxField` (`src/components/ui/form/`) — label + input + error in one component, used by every admin and public form |
| Icons | `lucide-react` |
| Image gallery (product detail) | Custom component using `next/image`, thumbnail strip + main image |

## Loading States
Every async operation shows a loading state — skeleton for lists/grids, spinner for buttons mid-submit (disable the button while pending). Never leave the UI looking frozen or unresponsive.

## Empty States
Every list/grid handles zero results: brief explanatory message + relevant CTA where applicable (e.g. "No products in this category yet" on a category page; "Add your first product" in the admin dashboard). Never render an empty grid or blank whitespace.

## Error States
- Public site: inline message with a retry option where relevant — never a raw error dump
- Admin forms: field-level errors rendered under each input from the Zod/react-hook-form error object
- Never expose raw API error objects, stack traces, or Prisma error messages in the UI

## Accessibility Baseline — WCAG 2.1 AA
- Semantic HTML: `<button>` not `<div onClick>`, `<nav>`, `<main>`, `<label>`
- All form inputs have a `<label>` or `aria-label`
- Visible focus ring on interactive elements — do not remove Tailwind's `:focus` outline without replacing it
- Color is not the only differentiator for state (pair with icon or text — e.g. "Out of Stock" badge, not just a dimmed color)
- Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text — check the terracotta/maroon/gold palette against cream backgrounds specifically, warm palettes can drift low-contrast
- `alt` text on all product images; decorative motif SVGs use `alt=""` or `aria-hidden="true"`
- Keyboard navigable — tab order matches visual order, WhatsApp/Email/Call links are real `<a>` tags (not JS-only click handlers)
