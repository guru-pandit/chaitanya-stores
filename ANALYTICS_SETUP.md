# Analytics & SEO Setup — Chaitanya Stores

This document explains how visitor tracking works on the website, how to finish setting it up, and
how to read the numbers once it's live. It's written for the shop owner / whoever manages the
Google/Microsoft accounts — no coding knowledge needed past Section 1.

**What this covers:** Google Tag Manager (GTM), Google Analytics 4 (GA4), and Microsoft Clarity —
three free tools that, together, tell you how many people visit the site, which products they look
at, and how many actually click WhatsApp or Call to enquire.

---

## Section 1 — Where to Find Your Account IDs

You need three IDs before tracking works. All three are free to set up.

| ID | Where to find it | Looks like |
|----|-------------------|------------|
| **GTM Container ID** | [tagmanager.google.com](https://tagmanager.google.com) → create a container for your website → **Admin** tab → **Container Settings** | `GTM-XXXXXXX` |
| **GA4 Measurement ID** | [analytics.google.com](https://analytics.google.com) → create a GA4 property → **Admin** → **Data Streams** → click your web stream | `G-XXXXXXXXXX` |
| **Clarity Project ID** | [clarity.microsoft.com](https://clarity.microsoft.com) → create a project for your website → **Settings** → the ID is in the setup code/URL | 10-character code |

### How to add them to the site

Open the `.env` file in the project (on the server, or ask your developer) and fill in these three
lines with the real values:

```
NEXT_PUBLIC_GTM_ID="GTM-XXXXXXX"
NEXT_PUBLIC_GA4_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_CLARITY_ID="xxxxxxxxxx"
```

Leaving any of these blank simply disables that one tool — the site still works normally either way.
**None of these are secret** (they're visible in any browser's page source), but they still shouldn't
be hardcoded into the code — that's why they live in `.env`, which is never committed to git.

After changing `.env`, the site needs to be rebuilt/redeployed for the new values to take effect.

---

## Section 2 — Setting Up the GTM Container

Once you're in your GTM container (tagmanager.google.com):

### 2a. Create the GA4 Configuration tag
This is the tag that actually connects GTM to your GA4 property.
1. **Tags** → **New**
2. Tag type: **Google Analytics: GA4 Configuration**
3. Measurement ID: paste your `G-XXXXXXXXXX` ID
4. Trigger: **All Pages** (the built-in trigger, fires on every page load)
5. Name it something like `GA4 - Config` and **Save**

### 2b. Create Custom Event triggers
The site sends events with plain names like `click_whatsapp`, `click_call`, `view_category`, etc.
(the full list is in Section 5 below). For each one you want to track in GA4, create a trigger:
1. **Triggers** → **New**
2. Trigger type: **Custom Event**
3. Event name: type the exact event name, e.g. `click_whatsapp`
4. **Save**

Repeat for `click_call`, `view_category`, `view_product`, and any others you want visibility into.

### 2c. Create GA4 Event tags
For each trigger above, create a matching tag that sends it to GA4:
1. **Tags** → **New**
2. Tag type: **Google Analytics: GA4 Event**
3. Configuration Tag: select the `GA4 - Config` tag from step 2a
4. Event Name: same name as the trigger, e.g. `click_whatsapp`
5. Trigger: select the matching Custom Event trigger from step 2b
6. Name it `GA4 - click_whatsapp` and **Save**

Do this at minimum for **click_whatsapp** and **click_call** — these are your two most important
tags, since they represent someone actually trying to reach you.

### 2d. Test with Preview mode before publishing
1. Click **Preview** (top right of GTM)
2. Enter your site's URL — this opens your site in a new tab connected to GTM's debug panel
3. Click around the site (browse a category, click WhatsApp, etc.) and watch the debug panel —
   each event you click should appear in the list on the left as it fires
4. If an event doesn't show up, double-check the trigger's event name matches exactly (event names
   are case-sensitive)

### 2e. Publish
Once Preview mode confirms everything fires correctly:
1. Click **Submit** (top right)
2. Add a version name/description (e.g. "Initial GA4 + conversion tracking")
3. Click **Publish**

Nothing goes live until you publish — you can safely experiment in Preview mode as much as you like.

---

## Section 3 — GA4 Dashboard

### Verify data is coming in
- **Reports** → **Realtime** — browse the site yourself in another tab; you should see yourself as
  an active user within a few seconds, and any events you trigger (WhatsApp click, etc.) should
  appear in the Realtime event list.

### Mark WhatsApp and Call clicks as Key Events (conversions)
This is the most important setup step — it tells GA4 "these are the actions that actually matter."
1. **Admin** → **Events**
2. Find `click_whatsapp` in the list (it'll appear here automatically once it's fired at least once)
3. Toggle **Mark as key event** on
4. Repeat for `click_call`

Once marked, you'll see a dedicated **Key events** count on GA4's reports and can build conversion
reports around them.

### A simple starting dashboard
Under **Reports** → **Engagement** → **Events**, you can see every event by name and count. The
ones worth watching weekly:
- `click_whatsapp` / `click_call` — your actual enquiries
- `view_category` — which product categories get the most attention
- `search` — what people are searching for (useful for spotting products you should stock or
  describe better)
- `page_view` on `/catalog/*` — your most-viewed products

---

## Section 4 — Microsoft Clarity

### Verify it's recording
Go to [clarity.microsoft.com](https://clarity.microsoft.com) → your project → **Recordings**.
Sessions typically appear within a couple of minutes of a real visit. If nothing shows up after
visiting the site yourself, check that `NEXT_PUBLIC_CLARITY_ID` is set correctly and the site has
been redeployed since.

### Heatmaps
**Heatmaps** tab → pick a page (e.g. `/catalog` or a popular product page) → see exactly where
people click and how far they scroll. For a catalog site, this is the fastest way to answer "are
people actually finding the agarbatti/dhoop they want, or giving up partway down the page?"

### Session recordings
Watch real (anonymized) sessions to see:
- Whether visitors use the search bar or browse by category
- Where people hesitate or click something that doesn't respond (Clarity flags these as
  **Rage Clicks** and **Dead Clicks** automatically — check those filters first)
- Whether they reach a product page and then leave without clicking WhatsApp/Call — a sign the
  product info or price wasn't clear enough

### What to look for specifically
- Which **agarbatti/dhoop products** get opened most often (via heatmap clicks on the catalog grid)
- Whether people scroll to the bottom of product pages to find the WhatsApp/Call buttons, or miss
  them
- Rage clicks on the search bar or filters — usually means expectations weren't met (e.g. searched
  for a brand that isn't stocked)

---

## Section 5 — Environment Variables Reference

| Variable | Purpose | Where to get it |
|----------|---------|------------------|
| `NEXT_PUBLIC_GTM_ID` | Loads the GTM container script | tagmanager.google.com → Admin → Container Settings |
| `NEXT_PUBLIC_GA4_ID` | Not used directly by the site — GA4 is configured *inside* GTM (Section 2a), this ID is just for your reference | analytics.google.com → Admin → Data Streams |
| `NEXT_PUBLIC_CLARITY_ID` | Loads the Microsoft Clarity recording script | clarity.microsoft.com → Settings |

All three are **public** by design (`NEXT_PUBLIC_` prefix — they're visible in the page source to
any visitor) but still live in `.env`, not hardcoded in the code, so they can be changed without a
code deploy and are never committed to git.

**Scope:** tracking only loads on the public site (home, catalog, product pages, contact, about) —
never on `/admin`, so the owner's own dashboard usage isn't recorded as visitor traffic.

---

## Section 6 — Event Reference

Every event below is fired automatically by the site — nothing further to configure in the code,
only in GTM (Section 2) to route them into GA4.

| Event | Fires when | Key params |
|-------|-----------|------------|
| `page_view` | Every page navigation (virtual pageview, since this is a single-page-feeling app) | `page_path` |
| `view_category` | A category page loads | `category_name` |
| `view_product` | A product detail page loads | `item_name`, `item_category`, `item_id` |
| `search` | A catalog search term is submitted (debounced — fires once per completed search, not per keystroke) | `search_term` |
| `click_whatsapp` ⭐ | Any WhatsApp link is clicked — product page, catalog empty state, contact page, footer, shop locations | `source_page`, `product_name` |
| `click_call` ⭐ | Any phone number link is clicked — same locations as above | `source_page` |
| `click_contact` | The Contact page loads | `source_page` |
| `filter_category` | The category dropdown on the catalog page is changed | `selected` |
| `image_view` | The product photo lightbox/zoom is opened | `product_name`, `image_index` |
| `scroll_50` / `scroll_90` | The visitor scrolls past 50% / 90% of a page (once each per page) | — |

⭐ = the two conversion events — mark both as **Key events** in GA4 (Section 3).

**Not implemented:** `share_product` — there's no share button anywhere on the site today, so this
event was left out rather than wired to nothing. If a share feature is added later, this is the
event name to reuse.

---

## Section 7 — Troubleshooting

**GTM not firing at all**
- Open the site, open browser DevTools (F12) → **Network** tab, filter for `gtm.js` — you should see
  it load. If not, check `NEXT_PUBLIC_GTM_ID` is set and the site was redeployed after setting it.
- Type `dataLayer` into the DevTools **Console** tab and press Enter — you should see an array of
  pushed events, growing as you navigate/click things.

**GA4 not receiving data**
- Check GTM Preview mode first (Section 2d) — if the event doesn't appear there, GA4 never sees it
  either; the problem is in GTM, not GA4.
- Check the Realtime report (Section 3) — GA4's standard reports can take 24–48 hours to populate,
  Realtime is instant.
- Double-check the GA4 Configuration tag (2a) has the correct Measurement ID.

**Clarity not recording**
- Ad blockers and some privacy browser extensions block Clarity — test in a plain browser window
  first before assuming it's broken.
- Confirm `NEXT_PUBLIC_CLARITY_ID` is set and the site was redeployed.

**Events not showing up anywhere**
- Console → type `dataLayer` — if events aren't appearing here, the problem is in the site code, not
  GTM/GA4 (unusual — check the browser console for JavaScript errors first).

**Product names with Hindi/regional text**
- Event params (like `product_name`) are sent as UTF-8 and GA4 handles Devanagari and other Indian
  scripts natively — nothing extra needed. If a name looks garbled in a GTM Preview payload, it's
  almost always a display-only quirk of the debug panel, not a real encoding problem — check the
  same event in GA4's Realtime report to confirm.

---

## Section 8 — Monthly SEO & Analytics Checklist

A short routine worth doing once a month, especially in the run-up to a festival:

- [ ] GA4 → **Reports** → **Engagement** → **Pages and screens** — check top landing pages
- [ ] GA4 → **Events** → check `view_category` breakdown — which categories get the most traffic
- [ ] GA4 → **Key events** — compare `click_whatsapp` + `click_call` counts month over month
- [ ] [Google Search Console](https://search.google.com/search-console) — check which search terms
      bring people to the site, and whether any pages have indexing errors
- [ ] Update product descriptions with seasonal keywords ahead of **Navratri**, **Diwali**, and
      **Ganesh Chaturthi** — these are the highest-traffic periods for a pooja samagri shop, and
      search terms shift toward festival-specific items in the weeks before each one
- [ ] Clarity → skim a handful of recent session recordings for anything that looks like friction
      (rage clicks, dead clicks, or long pauses on the same page)

---

## Appendix — What Was Already in Place

Before this work, the site already had solid SEO fundamentals — this setup only added
tracking/analytics on top:
- Dynamic `sitemap.xml` and `robots.txt`, kept in sync with the live catalog
- Per-page titles, meta descriptions, canonical URLs, and Open Graph tags on every public page
- `Store`/`WebSite`, `Product`, and `Breadcrumb` structured data (JSON-LD) — deliberately without a
  price field, since this is a catalog site with prices confirmed on enquiry, not a checkout flow
- Descriptive alt text on every product image

The one gap found and fixed as part of this work: several pages (home, about, contact, catalog,
category) had no Open Graph *image*, so links shared on WhatsApp showed no preview thumbnail. All
now default to the site logo (`/logo.png`) unless a page sets its own (product pages already use the
actual product photo).
