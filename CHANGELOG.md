# Changelog

All notable changes to Chaitanya Stores are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Public catalog route renamed**: `/products` → `/catalog` (route folder moved from `src/app/(site)/products/` to `src/app/(site)/catalog/`). Permanent (308) redirects added in `next.config.ts` for both `/products` and `/products/:slug` to preserve SEO. Admin routes `/api/products` and `/admin/products`, and the `Product` Prisma model, remain unchanged.
- **Contact form UX improved**: Added honeypot anti-spam field (`website`) and replaced transient toast notification with a persistent thank-you panel after successful submission.
- **Contact details fallback behavior**: When a contact detail (phone, WhatsApp, email, address) is unconfigured, the site now renders "Contact details coming soon" instead of fabricated placeholder values. Implements `hasContactValue()` type predicate and `CONTACT_COMING_SOON` constant in `src/lib/site-config.ts`.
- **Per-page metadata**: Rewritten Home, Catalog, About, and Contact page titles and descriptions with real location keywords (Sangmeshwar, Ratnagiri).
- **Product structured data**: `ProductJsonLd` no longer emits `offers`/`Offer` nodes (prices are indicative and unconfirmed; an Offer without a price violates schema.org validation rules, so omitted entirely). Product and Brand data still included.
- **Copy cleanup**: Removed all manufacturer/heritage language from public pages; the business is accurately described as a retailer of branded pooja materials, not a manufacturer, with no multi-generational heritage.

### No Changes
- Prisma schema (no migrations)
- Dependencies
- Admin product management (`/admin/products` and `/api/products` routes)
- Enquiry management workflow
