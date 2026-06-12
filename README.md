# WeddingTech — Live Photo Wall

A SaaS social wall for Thai weddings. Guests scan a QR, upload a photo + message,
and it appears fullscreen on the venue's display. Planners pay ฿1,400 per event.

Built as a real Next.js + Supabase app from the design prototype in
`../live-photo-wall-design/project/`. See `../WeddingTech Handoff.md` for the
locked product decisions.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16 (App Router, React 19, TypeScript) |
| Backend / Auth / DB / Realtime / Storage | Supabase |
| Payments | Omise (PromptPay default) |
| Text moderation | OpenAI Moderation API |
| Image moderation | Sightengine |

## Setup

### 1. Supabase
1. Create a project at https://supabase.com.
2. In **SQL Editor**, paste & run `supabase/migrations/001_init.sql`. This
   creates `events` + `submissions` tables, the `event_public()` RPC, RLS
   policies, and two public Storage buckets (`guest-photos`, `event-branding`).
3. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Omise
1. Sign up at https://www.omise.co.
2. Copy the test-mode public + secret keys into `.env.local`.
3. Until keys are set, activation falls back to the static PromptPay QR image
   and the "ชำระเรียบร้อย" button trusts the planner's click. Wire the Omise
   webhook to flip events to `active_ready` in production.

### 3. Moderation
- **OpenAI** — get an API key from https://platform.openai.com. Moderation is free.
- **Sightengine** — sign up at https://sightengine.com. Free tier: 2,000 ops/month.

If either pair of keys is missing, that check is skipped (dev-friendly).

### 4. Env vars
```bash
cp .env.example .env.local
# fill in keys
```

### 5. Run
```bash
npm install
npm run dev
```

App boots at http://localhost:3000.

## Routes

| Route | Purpose | Device |
|---|---|---|
| `/` | Marketing landing | Responsive |
| `/signup` `/login` `/reset-password` `/update-password` | Auth | Responsive |
| `/dashboard` | Planner event list | Responsive |
| `/dashboard/events/[id]` | Event settings | Responsive |
| `/dashboard/events/[id]/activate` | Pay ฿1,400 via PromptPay | Responsive |
| `/dashboard/events/[id]/control` | Live control (now playing, queue, pause/skip) | **Mobile-first dark** |
| `/display/[id]` | Idle QR / fullscreen photo rotation | **TV / fullscreen** |
| `/upload/[id]` | Guest photo + message submission | **Mobile-first** |

## Data flow

```
guest submits  →  POST /api/submissions
                    │
                    ├─ upload photo to Storage (service-role client)
                    ├─ moderate text (OpenAI) + image (Sightengine) in parallel
                    └─ insert row: status = approved | rejected (silent)

display queries  →  rpc.event_public + select submissions where
                     status in (approved, played) and approved_at <= now() - 60s

control panel    →  same query; mutate status = skipped, pinned = true,
                     events.paused = true via planner-authenticated client (RLS)

Realtime channel `event-{id}` pushes changes to both display & control panel.
```

## Key product decisions baked into the code

See the handoff doc for the full list:
- Submission cap: photo + name (≤40 chars) + message (≤150 chars).
- Auto-moderation only. Silent rejection — guests never learn their post was blocked.
- 60-second buffer after `approved_at` before a post is eligible for display.
- Flat ฿1,400 per event. No subscriptions.
- Display: one post fullscreen, 10–30s per post, ~0.5s fade.
- Event lifecycle: `draft → active_ready (paid) → active_live (Start Live) → ended`.
- After live starts, event details are read-only.
- 90-day data retention from event date. Schema includes `retention_until`;
  scheduler is left to be wired.

## What's stubbed / left to wire

- **Omise webhook** — `/api/events/[id]/activate` currently trusts the planner
  click. In production add `/api/webhooks/omise` and only flip status after
  the charge confirms.
- **Card payments** — only PromptPay is implemented.
- **Branding uploads** — settings reads `display_bg_url` / `guest_bg_url` /
  `logo_url`, but the file-picker UI isn't wired yet. Storage bucket + RLS ready.
- **90-day retention cron** — schema has `retention_until`; scheduler not wired.
  Use Supabase `pg_cron` or a Vercel cron route.

## File map

```
src/
├── app/
│   ├── page.tsx                  # Landing
│   ├── login/  signup/  reset-password/  update-password/
│   ├── dashboard/
│   │   ├── page.tsx              # Event list
│   │   └── events/[id]/          # Settings + activate + control
│   ├── display/[id]/             # TV display
│   ├── upload/[id]/              # Guest mobile
│   └── api/
│       ├── submissions/          # POST guest submissions w/ moderation
│       ├── payments/promptpay/   # POST Omise PromptPay charge
│       └── events/[id]/activate/ # POST to flip status (post-payment)
├── components/
│   ├── AuthLayout.tsx
│   └── ui/index.tsx              # Design-system primitives
├── lib/
│   ├── moderation.ts
│   ├── omise.ts
│   └── supabase/                 # browser, server, service-role clients
├── middleware.ts                 # Gates /dashboard/*
└── types/db.ts                   # Row types mirroring the SQL schema
supabase/migrations/001_init.sql
public/                           # Fonts, photos, sparkle assets
```
