# Cocos Parking — Project Context & Roadmap

**Single source of truth** for this project. Read this file at the start of every session before planning or coding.

**Status:** Implementation in progress — DB schema, employee PWA, and admin dashboard wired.

---

## What we're building

Replace a daily Google Spreadsheet for parking with a **PWA** + **admin dashboard**, same workflow, Cocos-branded UI.

| App | Path | Port | Users |
|-----|------|------|-------|
| Employee PWA | `app/` | 3000 | Everyone — sign in, onboard, claim/release spot, view live status |
| Admin dashboard | `dashboard/` | 3001 | Users with `profiles.is_admin = true` only |

Backend: **Supabase** (Postgres, Auth, Realtime). No shared `packages/` in v1.

---

## Approved designs (`design/`)

HTML mockups are **approved** — port these to React; do not redesign without asking.

| File | Purpose | UI pattern |
|------|---------|------------|
| [`design/app-login.html`](../design/app-login.html) | Google sign-in | Navy full-screen hero + white bottom sheet |
| [`design/app-onboarding.html`](../design/app-onboarding.html) | Name + plates | Parking header + info card + form + chips |
| [`design/app-parking.html`](../design/app-parking.html) | **Main employee screen** | Card list grouped by floor; claim/release bottom sheets |
| [`design/admin-login.html`](../design/admin-login.html) | Admin sign-in | Same login pattern as employee |
| [`design/admin-parking.html`](../design/admin-parking.html) | Slot management | **Simple table lists** by floor + action links |
| [`design/admin-users.html`](../design/admin-users.html) | User management | **Simple table list**; edit name + plates only |

**Styles:** [`design/parking-ui.css`](../design/parking-ui.css) (production target) + [`design/shared.css`](../design/shared.css) (base).  
**Logo:** [`cocos-logo.png`](../cocos-logo.png) at repo root.

### Employee app UI (reference: `app-parking.html`)

- Navy header, **44px centered logo**, avatar left, refresh right
- Title **"Cocheras"** + subtitle; white sheet overlapping header
- Hero card: current spot (Piso, N°, plate)
- Floor sections with "X libres" badge
- **Spot cards:** number badge · status · name/plate · indicator
  - **Libre** → green, tap → claim bottom sheet
  - **Ocupada** → gray, read-only
  - **Tu cochera** → blue highlight, tap → release bottom sheet

### Admin UI

- Same header + segmented control (Cocheras / Usuarios)
- **Tables, not cards** — keep admin views dense and scannable
- Cocheras: columns N° · Estado · Usuario · Patente · actions (Liberar / Editar / Eliminar)
- Usuarios: columns Nombre · Email · Patentes · Cochera · Editar
- Edit panels: inline forms below lists (mockups show example state)

### Design tokens

```css
--cocos-navy: #004795;
--cocos-blue: #bde3ff;
--cocos-green: #00a364;
--cocos-icon-blue: #0066cc;
```

Typography: **Inter**. Mobile-first. Rounded corners 16–24px.

---

## Key decisions (do not reverse without explicit ask)

| Topic | Decision |
|-------|----------|
| Daily cleanup | **Automatic cron + manual** "Reset día" button (same DB function) |
| Sign-in | **Any Google account** for now (company domain restriction later) |
| One spot per user | **Yes** — DB + UI |
| Admin access | **`profiles.is_admin` set only in Supabase** — never in app UI |
| Admin provisioning | User registers in app → you set `is_admin = true` in Supabase Studio/SQL |
| Admin edits users | **Name + plates only**; email read-only; no delete accounts in v1 |
| Admin edits slots | CRUD; delete only when unoccupied; force-release anytime |
| Spreadsheet UX | Same **workflow**, not spreadsheet **visuals** — cards for employees, tables for admin |
| Realtime | Supabase Realtime on occupancies (and spot changes for admin CRUD) |
| PWA | `app/` only — manifest + icons; **offline claim queue** with auto-sync when signal returns |
| Stats | Out of v1; `occupancies` history supports future dashboard |

---

## Data model

### `profiles` (extends `auth.users`)
- `full_name`, `license_plates` (text[]), `is_admin` (boolean, **Supabase-only writes**)
- `created_at`, `updated_at`

### `parking_spots`
- `floor` (int), `spot_number` (int), unique `(floor, spot_number)`

### `occupancies`
- `spot_id`, `user_id`, `occupied_at`, `released_at` (null = active)
- Partial unique indexes: one active occupancy per spot, one per user
- History row per claim/release → future statistics

### Seed spots

**Piso 1:** 8, 9, 10, 16, 17, 18, 20, 32  
**Piso 2:** 36, 37, 38, 39, 40, 41, 43, 44

### Admin SQL example

```sql
UPDATE profiles SET is_admin = true WHERE id = '<user-uuid>';
```

---

## Employee interaction rules

| Action | Behavior |
|--------|----------|
| Tap **available** spot | Confirm bottom sheet → claim |
| Tap **own** spot | Confirm bottom sheet → release |
| Tap **someone else's** spot | Read-only |
| Header refresh | Re-fetch / re-subscribe Realtime |

---

## Implementation order (current)

1. ~~HTML mockups~~ **DONE — approved**
2. ~~Database migration + RLS + seed~~ **DONE**
3. ~~Supabase Google OAuth + env~~ **DONE** (configure Google in Supabase + `.env.local`)
4. ~~Port designs → React~~ **DONE**
5. ~~Employee app~~ **DONE** (auth, onboarding, parking, claim/release, Realtime)
6. ~~Admin dashboard~~ **DONE** (admin guard, slot CRUD, user edit, reset day)
7. ~~PWA~~ **DONE** (manifest + logo icon)
8. **Daily reset cron** — Edge Function ready; schedule in Supabase Dashboard (~6am AR)

---

## Monorepo layout

```
cocos-parking/
├── app/              # Employee PWA (:3000) — scaffold only
├── dashboard/        # Admin (:3001) — template auth only
├── supabase/         # migrations empty, seed placeholder
├── design/           # Approved HTML mockups + parking-ui.css
├── context/          # This file
└── cocos-logo.png
```

---

## Local dev (once backend wired)

```bash
supabase start && supabase db reset
cp app/.env.local.example app/.env.local
cp dashboard/.env.local.example dashboard/.env.local
cd app && npm install @supabase/supabase-js @supabase/ssr && npm run dev
cd dashboard && npm run dev   # :3001
```

Google OAuth redirect URLs: `localhost:3000`, `localhost:3001`.

---

## Out of scope for v1

- Statistics dashboard
- Company-domain-only sign-in
- Admin promotion/demotion in UI
- User account deletion
- Shared UI package across apps
- Map / floor plan view
- Offline PWA sync

---

## Session handoff notes

- Design iteration went: spreadsheet clone → Cocos card list (employee) + table lists (admin)
- Canvas preview was rejected; **plain HTML in `design/` is the approved artifact**
- When componentizing, preserve class semantics from `parking-ui.css` where possible
- Update **this file** when decisions change or major milestones ship

*Last updated: June 2025 — designs approved, ready for implementation*
