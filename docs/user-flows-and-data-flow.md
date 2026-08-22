# User Flows & Data Flow

Companion to `CLAUDE.md` and `.claude/context/architecture.md` — those describe the codebase
structure and conventions; this describes how people actually move through the app and how data
moves through the system. See [README.md](../README.md) for setup.

## User Types

| User | Access | Entry point |
|---|---|---|
| Visitor | Public, no login | Any `(site)` route |
| Admin | Single role, credential login required | `/admin/*` |

There is no customer account tier — visitors never authenticate, they only browse and enquire.

---

## 1. Visitor User Flow

```mermaid
flowchart TD
    Start([Visitor arrives]) --> Home["/ (Home)"]
    Home --> Browse["/catalog (Catalog)"]
    Home --> CatLink["/categories/:slug"]
    Home --> About["/about"]
    Home --> Contact["/contact"]

    Browse -- "search / filter by category" --> Browse
    Browse --> Detail["/catalog/:slug (Product Detail)"]
    CatLink --> Detail

    Detail --> Enquire{Enquiry action}
    Enquire -- "WhatsApp" --> WA["wa.me deep link\n(opens WhatsApp, pre-filled message)"]
    Enquire -- "Email" --> Mail["mailto: link\n(opens email client, pre-filled subject/body)"]
    Enquire -- "Call" --> Tel["tel: link\n(opens phone dialer)"]

    Contact --> ContactForm["Fill name / contact / message"]
    ContactForm --> Submit["Submit → POST /api/contact"]
    Submit --> Logged["Enquiry row saved (optional log)"]

    WA --> Exit([Leaves site — conversation continues in WhatsApp])
    Mail --> Exit2([Leaves site — conversation continues in email client])
    Tel --> Exit3([Leaves site — phone call])
```

Key point: WhatsApp/Email/Call are **exit points** — the site never tracks what happens after the
tap. The only enquiry Chaitanya Stores can see server-side is a contact-form submission
(logged to `Enquiry`, if that optional feature is enabled).

---

## 2. Admin User Flow

```mermaid
flowchart TD
    Start([Admin navigates to /admin]) --> Gate{Session valid?}
    Gate -- "no" --> Login["/admin/login"]
    Gate -- "yes" --> Dashboard["/admin/dashboard"]

    Login -- "correct credentials" --> Dashboard
    Login -- "wrong credentials" --> Login

    Dashboard --> Categories["/admin/categories"]
    Dashboard --> Products["/admin/products"]
    Dashboard --> ShopLocations["/admin/shop-locations"]
    Dashboard --> FestivalBanner["/admin/festival-banner"]
    Dashboard --> HeroImages["/admin/hero-images"]

    Categories --> NewCat["/admin/categories/new"]
    Categories --> EditCat["/admin/categories/:id/edit"]
    Categories --> DelCat{Delete category}
    DelCat -- "has products" --> Blocked["Blocked — error shown,\nmust reassign/delete products first"]
    DelCat -- "empty" --> Removed["Category removed"]

    Products --> NewProd["/admin/products/new"]
    Products --> EditProd["/admin/products/:id/edit"]
    NewProd --> Upload["Upload image(s) +\noptional variants (label/price/inStock)"]
    EditProd --> Upload

    ShopLocations --> NewLoc["/admin/shop-locations/new"]
    ShopLocations --> EditLoc["/admin/shop-locations/:id/edit"]
    ShopLocations --> SetPrimary["Set Primary\n(exactly one location is primary at a time)"]

    FestivalBanner --> NewBanner["/admin/festival-banner/new\n(image or video upload)"]
    FestivalBanner --> EditBanner["/admin/festival-banner/:id/edit"]
    FestivalBanner --> SetActive["Set Active\n(at most one banner active; none is normal)"]

    HeroImages --> UploadHero["Upload/reorder homepage hero images\n(SiteSettings singleton — no list/new/edit routes)"]

    Dashboard --> SignOut["Sign Out"] --> Login
```

Every `/admin/*` route except `/admin/login` is gated — a direct link to a protected page while
signed out redirects straight to login (see the auth data flow below).

---

## 3. Data Flow — Public Site (Server Component)

The public site never round-trips through an API route; it reads the database directly during
server rendering.

```mermaid
sequenceDiagram
    participant B as Browser
    participant SC as Server Component (app/(site)/**)
    participant P as Prisma Client (src/lib/prisma.ts)
    participant DB as SQLite / Postgres

    B->>SC: GET /catalog?category=incense-sticks
    SC->>P: prisma.product.findMany({ where, include: { category } })
    P->>DB: SQL query
    DB-->>P: rows
    P-->>SC: typed Product[]
    SC-->>B: rendered HTML (no client fetch, no loading spinner)
```

No React Query, no client-side fetch — this is the whole reason the public site loads fast and
stays simple.

---

## 4. Data Flow — Admin CRUD (React Query)

Admin screens are Client Components; server data always goes through a React Query hook →
API route → Prisma, never direct Prisma access from the browser bundle.

```mermaid
sequenceDiagram
    participant U as Admin (browser)
    participant Hook as React Query hook (src/hooks/**)
    participant API as API Route (src/app/api/**)
    participant Auth as auth() (src/lib/auth.ts)
    participant Zod as Zod schema (src/lib/validations/**)
    participant P as Prisma Client
    participant DB as Database

    U->>Hook: submit Product form
    Hook->>API: POST /api/products (fetch)
    API->>Auth: auth() — session check
    Auth-->>API: session or null
    alt no session
        API-->>Hook: 401 Unauthorized
        Hook-->>U: show auth error
    else session valid
        API->>Zod: productSchema.safeParse(body)
        alt invalid
            Zod-->>API: error.flatten()
            API-->>Hook: 400 + field errors
            Hook-->>U: inline form errors
        else valid
            API->>P: prisma.product.create({ data })
            P->>DB: INSERT
            DB-->>P: new row
            P-->>API: Product
            API-->>Hook: 201 + Product JSON
            Hook->>Hook: queryClient.invalidateQueries(['products'])
            Hook-->>U: list re-fetches, UI updates
        end
    end
```

This same shape (hook → route → `auth()` → Zod → Prisma) applies to categories, shop locations,
and festival banners, and to delete/update, with a couple of domain-specific guards: the
category-delete route checks `product.count()` before allowing deletion ("cannot delete category
with products"), and the shop-location/festival-banner "Set Primary"/"Set Active" actions run as a
transaction that flips the previous primary/active row off before flipping the new one on, so
exactly one (or, for banners, at most one) stays true. The hero-images save (`/admin/hero-images`)
follows the same hook → route → Zod → Prisma shape but updates the single `SiteSettings` row
instead of a list.

---

## 5. Data Flow — Authentication

```mermaid
sequenceDiagram
    participant U as Admin (browser)
    participant Login as /admin/login (Client Component)
    participant NA as NextAuth (src/lib/auth.ts)
    participant P as Prisma Client
    participant Proxy as src/proxy.ts (route protection)

    U->>Login: submit email + password
    Login->>NA: signIn("credentials", {...})
    NA->>P: prisma.adminUser.findUnique({ email })
    P-->>NA: AdminUser or null
    NA->>NA: bcrypt.compare(password, hashedPassword)
    alt match
        NA-->>Login: session established (JWT cookie)
        Login->>U: redirect to /admin/dashboard
    else no match
        NA-->>Login: error
        Login-->>U: "Invalid email or password"
    end

    Note over U,Proxy: On every subsequent /admin/* request
    U->>Proxy: GET /admin/products
    Proxy->>Proxy: decode session JWT (no DB call — edge-safe auth.config.ts)
    alt valid session
        Proxy-->>U: request proceeds
    else no session
        Proxy-->>U: redirect to /admin/login
    end
```

`auth.config.ts` (no Prisma/bcrypt imports) is what `proxy.ts` uses so the route-protection layer
never needs a database round trip — it only checks the signed JWT. The full `auth.ts` (with the
Prisma-backed Credentials provider) is only loaded by the actual sign-in API route.

---

## 6. Data Flow — Image Upload

```mermaid
sequenceDiagram
    participant U as Admin (Product form)
    participant Hook as useUploadImage hook
    participant API as POST /api/upload
    participant Auth as auth()
    participant Lib as src/lib/upload.ts
    participant Disk as public/uploads (dev)\n / cloud storage (prod)

    U->>Hook: select image file
    Hook->>API: multipart/form-data POST
    API->>Auth: session check
    Auth-->>API: session valid
    API->>Lib: saveUploadedImage(file)
    Lib->>Lib: validate MIME type + size
    Lib->>Disk: write file, generate UUID filename
    Disk-->>Lib: stored path/URL
    Lib-->>API: "/uploads/<uuid>.jpg"
    API-->>Hook: 201 { path }
    Hook-->>U: image added to form's images[] array
```

`saveUploadedImage()` is the single seam for the local-disk → S3/Cloudinary swap described in
[README.md](../README.md#2-move-image-uploads-off-local-disk) — nothing upstream of it changes.

---

## 7. Data Flow — Enquiry (Contact Form)

```mermaid
sequenceDiagram
    participant U as Visitor
    participant Form as ContactForm (Client Component)
    participant API as POST /api/contact
    participant Zod as contactSchema
    participant P as Prisma Client
    participant DB as Database

    U->>Form: fill name / contact / message, submit
    Form->>API: POST /api/contact
    API->>Zod: contactSchema.safeParse(body)
    alt invalid
        Zod-->>API: error.flatten()
        API-->>Form: 400
        Form-->>U: inline validation errors
    else valid
        API->>P: prisma.enquiry.create({ data })
        P->>DB: INSERT
        DB-->>P: row
        P-->>API: Enquiry
        API-->>Form: 201
        Form-->>U: "Thanks — we'll get back to you soon."
    end
```

Unlike WhatsApp/Email/Call, this is the one enquiry channel the business can see inside the app
(admin has no UI for it yet — the `Enquiry` table exists per the spec as an optional log; querying
it today means `npx prisma studio` or a future `/admin/enquiries` screen).
