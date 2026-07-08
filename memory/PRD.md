# GSN Fresh Fish Service — PRD

## Original Problem Statement
Modern, responsive bilingual (Marathi + English) fish shop website named **GSN Fresh Fish Service**.
Customers view today's available fish (photo, MR+EN name, price/kg, availability). Homepage: hero banner (seafood/ocean), live date/time, shop OPEN/CLOSED status. Contact section with owner, mobile, WhatsApp, address, Google Maps, business hours. Floating WhatsApp/Call/Maps buttons. Footer with social links. Admin panel (email+password) for fish CRUD, image upload, price, availability toggle, shop status. Ocean Blue / White / Aqua theme.

## Architecture
- **Backend**: FastAPI + Motor (Async MongoDB) + JWT (httpOnly cookies) + bcrypt.
- **Frontend**: React 19 + React Router + Tailwind + shadcn UI + Framer / CSS animations + Lucide icons.
- **Auth**: Custom email/password JWT (access 12h, refresh 7d) via httpOnly cookies; admin seeded from env on startup.
- **Image Storage**: base64 in MongoDB (max 800 KB client-side).
- **Fonts**: Baloo 2 (display), Mukta (body), Khand (numeric) — Devanagari-friendly.
- **Colors**: Ocean Blue (#005B96), Deep Ocean (#03396C), Aqua (#00A8E8), status Green/Red.

## User Personas
1. **Customer** — no account; browses fish list, checks availability & status, contacts via WhatsApp/Call/Maps.
2. **Shop Owner (Admin)** — logs in with email/password; manages fish, prices, availability, shop status, notice banner, contact settings.

## Core Requirements (Static)
- Bilingual UI (Marathi primary + English secondary).
- Live shop status with instant sync.
- Fish CRUD with image, MR+EN names, price/kg, availability, "Today's Special" flag.
- Contact section + floating WhatsApp/Call/Maps buttons.
- Responsive across mobile/tablet/desktop.
- SEO-friendly semantic HTML.

## Implemented (2026-02-08)
- FastAPI backend: `/api/auth/{login,logout,me,refresh}`, `/api/fish`, `/api/shop-status`, `/api/settings`, `/api/admin/{fish,shop-status,settings}`.
- Admin seed on startup via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars.
- 6 sample fish auto-seeded (Pomfret, Rohu, Surmai, Bangda, Bombil, Prawns).
- Homepage: hero with live date/time (Marathi calendar), status badge with pulse, fish grid, contact, footer.
- Admin dashboard: Fish CRUD table, shop status toggle, notice banner, settings tab, image upload (base64).
- Floating WhatsApp/Call/Maps buttons + footer social links.
- Fixed bugs from testing: `/auth/logout` now clears both cookies (browser-standard), `PUT /admin/fish/{id}` supports partial updates.

## Backlog (P1/P2)
- P1: Add "Today's Special" filter tab on homepage.
- P1: Email or WhatsApp notification templates when a fish's availability changes.
- P2: Image compression on upload (client-side).
- P2: Multi-admin support + role-based permissions.
- P2: Sales / order-log module for owner analytics.
- P2: Multi-language toggle to add Hindi.

## Test Credentials
Admin: `admin@gsnfish.com` / `Admin@123` (also in `/app/memory/test_credentials.md`)
