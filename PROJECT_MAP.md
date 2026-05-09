# PROJECT_MAP.md — Throughline
> Behavioral Intelligence Platform · Last updated: 2026-05-08 · **M0 complete**

---

## [PRODUCT_VISION]

**Tagline**: Turn your CliftonStrengths report into a life operating manual.

**Core promise**: Upload a Gallup CliftonStrengths 34 PDF → receive 13 sections of clear,
actionable, theme-grounded insight. Every claim tied to the user's specific ranked themes.
No generic motivational language. Practical actions, not personality descriptions.

**Audience**: Between private and public — authenticated users, controlled access.

**Design north star**: Apple simplicity × Notion clarity × behavioral intelligence.

---

## [TECH_STACK]

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16.2.6 (App Router + React 19) | RSC for cheap insight rendering, streaming routes |
| Language | TypeScript 5.x | Zod schemas are the contract |
| Styling | Tailwind CSS v4 | `@theme inline` design tokens |
| UI | shadcn/ui primitives (manual) | Own the components, no lock-in |
| Animation | Motion v12 | Layout animations, route transitions |
| Icons | Lucide React | |
| Fonts | Inter (sans) + Fraunces (display) | via `next/font/google` |
| Auth | Clerk v7 | Free tier · 10k MAU |
| DB | Neon (Postgres) + Drizzle ORM | Free tier · serverless-native |
| Storage | Vercel Blob | Free 500MB · raw PDFs |
| AI | `@anthropic-ai/sdk` | Haiku 4.5 + Sonnet 4.6 |
| Validation | Zod v4 | Forms → API → LLM output |
| Hosting | Vercel Hobby | Free · streaming routes bypass 10s timeout |
| Observability | Vercel Analytics + console logging | Lightweight, async |

**Streaming note**: All AI generation routes use `ReadableStream` — this bypasses Vercel Hobby's
10-second function timeout. Each insight section streams as it completes.

---

## [SYSTEM_FLOW]

```
[/] Landing page (server)
  ├── [/sign-up]  Clerk signup
  └── [/sign-in]  Clerk signin
          ↓
[/dashboard] Authenticated home
  └── Upload PDF → POST /api/upload
        ↓ Vercel Blob (stores raw PDF)
        ↓ DB: reports row (status=pending)
        ↓
      POST /api/extract
        ↓ Haiku 4.5: PDF → ThemeEntry[34] → Zod validate
        ↓ DB: reports.themes saved, status=processing
        ↓
[/report/[id]] Insight dashboard
  └── GET /api/generate?reportId=[id] (streaming)
        ↓ Parallel: 14 sections via Sonnet 4.6 / Haiku 4.5
        ↓ Each section streams as it completes
        ↓ DB: InsightRecord per section
        ↓
      Section deep-dive views
      Action plan view
      Export (PDF / markdown)
```

---

## [INSIGHT_ARCHITECTURE]

### Tiers

| Tier | Label | Sections | Model |
|------|-------|----------|-------|
| 1 | Identity | Core Strength Identity, Signature Pattern | Sonnet 4.6 |
| 2 | Acting | Productivity Style, Decision-Making, Daily Actions, Career Alignment | Sonnet 4.6 |
| 3 | Others | Communication, Collaboration, Leadership, Relationships | Haiku 4.5 |
| 4 | Mirror | Blind Spots, Stress Patterns, Work Environment, Growth | Haiku 4.5 |

### Output schema (per section)

```typescript
{
  headline:     string          // ≤12 words, declarative
  summary:      string          // 2–3 sentences
  evidence:     string[]        // grounded in user's specific themes
  actions: [{
    when:  "today" | "this_week" | "this_quarter"
    text:  string
    why:   string               // references a specific theme by name
  }]
  watchOutFor?: string          // optional liability note
}
```

### Anti-generic rule

Every claim must reference ≥1 of the user's themes by name.
Haiku specificity-check pass rejects and regenerates generic sections (score ≥3/5 genericness).

---

## [UI_SYSTEM]

### Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| background | `#FAF8F4` | Page background |
| foreground | `#1A1A1A` | Primary text |
| muted | `#F0EDE8` | Section backgrounds |
| muted-foreground | `#6B6B6B` | Secondary text |
| card | `#FFFFFF` | Card surfaces |
| border | `#E5E1DB` | Dividers, card outlines |
| executing | `#C4713A` | Clay / terra |
| influencing | `#D4962A` | Amber / gold |
| relationship | `#4A8C6F` | Sage / teal |
| strategic | `#4A5E8C` | Indigo / slate |

### Typography

- **Display**: Fraunces (serif, variable, opsz axis) — headlines, hero text
- **Body**: Inter (sans, variable) — UI, labels, paragraphs

### Key components (M4)

| Component | Variants | Purpose |
|-----------|----------|---------|
| `InsightCard` | hero, standard, compact | Core insight display unit |
| `ThemeChip` | — | Domain-colored theme label |
| `DomainWheel` | — | Hero visualization (Visx) |
| `ActionRow` | — | when / text / why action item |
| `NavRail` | — | Left persistent nav (14 sections) |
| `UploadZone` | idle, dragover, uploading, error | PDF drop target |
| `ProcessingStream` | — | Per-section streaming progress |

### Layout rules

- 8pt grid · max content width 720px prose / 1200px grid
- Mobile: NavRail collapses to bottom tabs + section pager
- No dark mode (v1) — warm-neutral palette works without it

---

## [AI_PIPELINE]

```
1. Extract  (Haiku 4.5)
   ├── Input: PDF file (via Anthropic Files API or base64)
   ├── Output: ThemeEntry[34] — Zod-validated
   └── Guard: reject upload if <30 valid Gallup themes found

2. Ground
   ├── System prompt: 34-theme reference corpus [CACHED per session]
   └── User context: top 10 themes with Gallup definitions [not cached]

3. Generate (parallel, streaming to client)
   ├── Tier 1 sections → Sonnet 4.6 (2 parallel requests)
   ├── Tier 2 sections → Sonnet 4.6 (4 parallel requests)
   ├── Tier 3 sections → Haiku 4.5  (4 parallel requests)
   └── Tier 4 sections → Haiku 4.5  (4 parallel requests)
       All: Zod-validated structured JSON · streamed per section

4. Specificity check  (Haiku 4.5)
   ├── Score each section 1–5: "could this apply to anyone?"
   └── Score ≥3 → regenerate once with stronger theme-grounding

5. Persist
   └── Each section saved as InsightRecord in Neon DB
```

### Cost estimate (with prompt caching)

~$0.02–0.05 per full report (Haiku 4.5 primary, Sonnet 4.6 for Tier 1–2).

---

## [DATABASE_SCHEMA]

```sql
-- users (synced from Clerk via webhook)
users (
  id         uuid primary key,
  clerk_id   text unique not null,
  email      text not null,
  created_at timestamp default now()
)

-- reports
reports (
  id           uuid primary key,
  user_id      uuid references users(id),
  file_name    text not null,
  blob_url     text not null,
  themes       jsonb,              -- ThemeEntry[34]
  status       text default 'pending',  -- pending|processing|complete|failed
  uploaded_at  timestamp default now(),
  processed_at timestamp
)

-- insights
insights (
  id           uuid primary key,
  report_id    uuid references reports(id),
  section      text not null,     -- InsightSection enum value
  content      jsonb not null,    -- InsightContent
  generated_at timestamp default now(),
  model        text not null
)
```

---

## [LOGGING & OBSERVABILITY]

All logging is **async, fire-and-forget** — never blocks user flow.

| Event | Data captured |
|-------|--------------|
| `upload.received` | file size, mime, anonymized report ID |
| `parse.failed` | error class, page count, report ID |
| `extract.invalid` | unrecognized themes, count |
| `generate.section` | section name, model, latency_ms, tokens |
| `generate.regenerated` | section, regeneration reason |
| `flow.completed` | total duration, report ID |
| `export.requested` | format (pdf/markdown) |

Stack: `console.log` → Vercel log drain → Vercel Analytics for page-level.

---

## [FILE STRUCTURE]

```
throughline/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              ← protected layout
│   │   │   ├── dashboard/page.tsx      ← upload UI + report list
│   │   │   └── report/[id]/page.tsx    ← insight dashboard
│   │   ├── api/
│   │   │   ├── health/route.ts         ✅ M0
│   │   │   ├── upload/route.ts         ← M1
│   │   │   ├── extract/route.ts        ← M1
│   │   │   └── generate/route.ts       ← M2 (streaming)
│   │   ├── globals.css                 ✅ M0
│   │   ├── layout.tsx                  ✅ M0
│   │   └── page.tsx                    ✅ M0
│   ├── components/
│   │   ├── landing/
│   │   │   └── nav.tsx                 ✅ M0
│   │   ├── upload/                     ← M1
│   │   ├── insights/                   ← M4
│   │   └── dashboard/                  ← M4
│   ├── lib/
│   │   ├── anthropic.ts                ✅ M0
│   │   ├── utils.ts                    ✅ M0
│   │   ├── db/
│   │   │   ├── index.ts                ← M1
│   │   │   └── schema.ts               ← M1
│   │   ├── pdf/
│   │   │   └── extract.ts              ← M1
│   │   └── insights/
│   │       ├── schema.ts               ← M2
│   │       ├── prompts.ts              ← M2
│   │       └── sections/               ← M3
│   ├── types/
│   │   └── index.ts                    ✅ M0
│   └── middleware.ts                   ✅ M0
├── PROJECT_MAP.md                      ✅ M0
├── .env.local.example                  ✅ M0
├── next.config.ts                      ✅ M0
└── package.json
```

---

## [ORPHANS & PENDING]

### ✅ M0 — Foundation (complete)
- [x] Next.js 16.2.6 + React 19 + Tailwind v4 scaffold
- [x] Design tokens (globals.css) — warm-neutral palette, 4 domain colors
- [x] Clerk v7 auth (layout, proxy.ts middleware, auth pages)
- [x] Anthropic SDK lazy singleton + MODELS/MAX_TOKENS constants
- [x] `/api/health` smoke-test endpoint
- [x] Landing page (server component, Show for auth state)
- [x] Shared types (ThemeEntry, InsightContent, CLIFTON_THEMES registry)
- [x] PROJECT_MAP.md

### ✅ M1 — Upload & Extract (complete)
- [x] Neon + Drizzle schema (users, reports, insights) + drizzle.config.ts
- [x] Clerk webhook endpoint (user.created/updated/deleted)
- [x] UploadZone component (5 states: idle/dragover/uploading/extracting/error)
- [x] `POST /api/upload` → Vercel Blob + DB record
- [x] `POST /api/extract` → Haiku 4.5 PDF parsing + Zod validation + specificity guard
- [x] Dashboard: upload UI + report list + empty state + ReportCard

### ✅ M2/M3 — Generation Pipeline (complete)
- [x] InsightContentSchema (Zod v4) — headline/summary/evidence/actions/watchOutFor
- [x] 34-theme reference corpus with Gallup definitions (prompt cached)
- [x] 14 section-specific prompts with anti-generic rules
- [x] generateSection() with auto-retry on generic output
- [x] `GET /api/generate` — SSE streaming, 14 parallel sections, caches served immediately
- [x] Sections persisted to DB as they complete; report marked complete at 80%+

### ✅ M4 — Report Dashboard (complete)
- [x] useInsightStream() hook (EventSource, reconnection, progress tracking)
- [x] InsightCard (hero/standard/compact variants + ActionRow with check-off)
- [x] InsightCardSkeleton (streaming placeholder with pulse animation)
- [x] ReportView: 4-tier layout, live progress bar, domain theme chips
- [x] `/report/[id]` server page (loads DB insights, streams new ones)

### ✅ M5 — Export (complete)
- [x] `GET /api/export/[reportId]?format=markdown` — structured .md download
- [x] `GET /api/export/[reportId]?format=pdf` — print-optimized HTML with auto-print

### 🔧 Setup Required (user action)
- [ ] Copy `.env.local.example` → `.env.local` and fill in:
  - `ANTHROPIC_API_KEY` — https://console.anthropic.com
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — https://dashboard.clerk.com
  - `DATABASE_URL` — Neon pooled connection string
  - `BLOB_READ_WRITE_TOKEN` — Vercel Dashboard → Storage → Blob
  - `CLERK_WEBHOOK_SECRET` — Clerk Dashboard → Webhooks
- [ ] Run `npm run db:push` to create DB tables
- [ ] Configure Clerk webhook: `https://your-domain/api/webhooks/clerk`
  Subscribe to: `user.created`, `user.updated`, `user.deleted`

### 📋 M6 — Polish (next)
- [ ] Motion animations (section reveal stagger, card hover via `motion` package)
- [ ] DomainWheel visualization (Visx pie/arc showing theme domain distribution)
- [ ] NavRail (desktop left sidebar listing 14 sections + completion state)
- [ ] Cross-section Action Plan view (all actions in one place, filterable by when)
- [ ] Error boundaries for individual section failures
- [ ] Lighthouse audit: a11y ≥95, perf ≥90 on report page
- [ ] Staggered skeleton reveal (sections appear in tier order)
