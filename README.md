<div align="center">

# devopsdojo

**From zero to senior DevOps, one micro-lesson at a time.**

Mobile-first PWA: short concepts, FSRS spaced repetition, and interleaving across
ten certification-anchored modules.

[![CI](https://github.com/valeboth/devopsdojo/actions/workflows/ci.yml/badge.svg)](https://github.com/valeboth/devopsdojo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

</div>

---

## Features

Three modes on the dashboard, and nothing else competing for attention:

- **Level test** — adaptive placement, ~30 questions in 10-15 minutes, interleaved
  across modules. Sets your level per module; you can override any of them by hand.
- **Interviews** — timed sessions from real interview questions, scoped by stack,
  level and duration. Scored with a breakdown per module and your three weakest
  areas linked back to the topic that covers them.
- **Courses** — the lesson loop: a short concept, 3-7 exercises, a recap. Exercises
  interleave the current topic with earlier modules and whatever is due for review.

Everything else that makes it work:

- **Seven card types** — multiple choice, multi-select, ordering, matching,
  fill-in-the-blank, log-tap (find the line that explains the failure), and swipe
  flashcards.
- **FSRS scheduling** with an append-only review log, so intervals reflect how
  well you actually know a card rather than how recently you saw it.
- **Interleaving** — a lesson mixes new cards from this topic with cards from the
  two previous modules and anything due, because studying one topic in a block
  feels productive and does not last.
- **Simulated sandbox** — deterministic terminal snapshots. You diagnose a broken
  pod by reading real output and tapping, not by typing on a phone keyboard.
- **Bilingual** — English canonical, Romanian optional per field, with independent
  preferences for the interface and the content.
- **Streak, and only streak.** No XP, no hearts, no leagues, no notifications.
- **$0/month** on Cloudflare's free tier. Open source, Apache 2.0.

Not in v1: native app, leaderboards, an AI tutor at runtime, offline mode, a code
editor or interactive terminal on the phone.

## Stack

| Layer      | Choice                                             | Why                                                                                                            |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Framework  | SvelteKit 2 + Svelte 5 (runes)                     | One piece of infrastructure for UI and API ([ADR 001](docs/adr/001-sveltekit-only-no-hono.md))                 |
| Runtime    | Cloudflare Workers, `@sveltejs/adapter-cloudflare` | One Worker serves SSR and assets — same origin, no CORS                                                        |
| Database   | Cloudflare D1 + Drizzle ORM                        | SQLite at the edge; migrations generated offline and committed                                                 |
| Auth       | Better Auth, OAuth-only (GitHub + Google)          | No password hashing — it does not fit the 10 ms CPU budget ([ADR 002](docs/adr/002-oauth-only-no-password.md)) |
| Scheduler  | `ts-fsrs` (fuzz disabled)                          | Better retention than SM-2, and deterministic enough to unit test ([ADR 003](docs/adr/003-fsrs-over-sm2.md))   |
| Styling    | Tailwind CSS 4 (CSS-first)                         | Theme tokens in `src/app.css`, no `tailwind.config.ts`                                                         |
| Validation | Zod 4                                              | One schema per card type, shared by the content pipeline, the API and the UI                                   |
| Tests      | Vitest 5 + Playwright                              | Unit for the pure logic, E2E on two phone viewports                                                            |
| PWA        | `@vite-pwa/sveltekit`, minimal service worker      | Manifest and install prompt; no API caching, no offline ([D19](docs/PROMPT-v2.1.md))                           |

## Project layout

```
src/
├── app.html · app.css · app.d.ts     # shell, theme tokens, Platform types
├── hooks.server.ts                   # session → locals.user, language resolution
├── lib/
│   ├── server/
│   │   ├── db/        schema.ts (18 tables), client.ts (per-request Drizzle)
│   │   ├── auth/      better-auth.ts, guards.ts, allowlist.ts
│   │   ├── content/   queries with en fallback
│   │   ├── placement/ · interleaving/ · interview/ · streak/ · sandbox/
│   ├── srs/           fsrs.ts, grading.ts — pure, no I/O, fully tested
│   ├── cards/         schemas.ts (per type), content-schemas.ts (per file)
│   ├── i18n/ · client/ · shared/
└── routes/
    ├── +page.svelte                  # dashboard
    ├── login/ · onboarding/placement/ · decks/ · lesson/ · review/
    ├── interview/ · sandbox/ · profile/
    └── api/                          # auth, cards/next, reviews, placement, …

content/           # source of truth for content — JSON, reviewed in PRs
├── decks/<nn>-<slug>/deck.json + topics/*.json
├── scenarios/ · placement/ · sources/
└── CONTENT-GUIDE.md

drizzle/           # generated migrations, committed, applied by wrangler
scripts/           # content pipeline, source ingestion, dev seed, icons
tests/             # unit · integration (local D1) · e2e (iPhone SE + 14)
docs/              # PROMPT-v2.1.md, architecture.md, adr/001-008
```

## Local setup

Requires Node 24+ and npm.

```sh
git clone https://github.com/valeboth/devopsdojo.git
cd devopsdojo
npm install

cp .dev.vars.example .dev.vars        # then fill it in — see Secrets below
npx wrangler d1 create devopsdojo-db  # paste the database_id into wrangler.toml
npm run db:migrate:local              # create the tables in the local D1
npm run seed:dev                      # optional: 1 deck, 2 topics, 20 fake cards

npm run dev                           # http://localhost:5173
```

`npm run dev` uses Vite with an emulated platform. To run against the real Workers
runtime — worth doing before any deploy — use `npm run dev:wrangler`.

## Secrets and environment

Locally these live in `.dev.vars` (gitignored). In production each one is set once
with `wrangler secret put <NAME>`. None of them ever reaches the browser: the
client talks only to the Worker.

| Variable                                    | Required | Purpose                                                                                    |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`                        | yes      | Session signing key. `openssl rand -base64 32`                                             |
| `BETTER_AUTH_URL`                           | yes      | `http://localhost:5173` locally, `https://devopsdojo.valegboth.win` in production          |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | yes      | GitHub OAuth App                                                                           |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no       | Google OAuth client; the Google button fails without it                                    |
| `ALLOWED_EMAILS`                            | no       | Signup allowlist, CSV. Empty means anyone may sign up. `@domain.com` allows a whole domain |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | no       | Only `scripts/sources/reddit.ts`                                                           |

OAuth callback URLs — register both, per provider:

```
http://localhost:5173/api/auth/callback/github
https://devopsdojo.valegboth.win/api/auth/callback/github
```

GitHub repository secrets for CI: `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit,
D1:Edit, Account Settings:Read) and `CLOUDFLARE_ACCOUNT_ID`.

## npm scripts

| Script                                   | What it does                                                      |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `dev`                                    | Vite dev server with an emulated platform                         |
| `dev:wrangler`                           | Build, then serve on the real Workers runtime                     |
| `build` · `preview`                      | Production build; preview it locally                              |
| `lint` · `lint:fix`                      | Prettier check + ESLint                                           |
| `typecheck`                              | `svelte-check` against `tsconfig.json`                            |
| `test` · `test:watch`                    | Vitest (unit + integration)                                       |
| `test:e2e`                               | Playwright on iPhone SE (375×667) and iPhone 14 (390×844)         |
| **`check`**                              | **lint + typecheck + test + build + content:validate — the gate** |
| `db:generate`                            | `drizzle-kit generate` after editing `schema.ts`                  |
| `db:migrate:local` / `db:migrate:remote` | Apply migrations (remote runs in CI only)                         |
| `content:validate`                       | Zod + the content rules over all of `content/`                    |
| `content:sync`                           | Idempotent upsert of `content/` into D1 (Phase 2)                 |
| `content:stats`                          | Cards per deck/topic/type/difficulty, translation coverage        |
| `content:translate-check`                | What Romanian is missing, and what is wrong                       |
| `seed:dev`                               | Fake content in the **local** D1                                  |
| `icons`                                  | Regenerate the PWA icons from the theme tokens in `src/app.css`   |
| `deploy`                                 | `wrangler deploy` — CI runs this, not you                         |

## API routes

Same origin, session-authenticated. `401` when unauthenticated.

| Route                                  | Method    | Purpose                                                                       |
| -------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| `/api/auth/[...all]`                   | GET, POST | Better Auth handler (OAuth callbacks, sign-out)                               |
| `/api/cards/next`                      | GET       | Card selection for a session: `?mode=&deck=&topic=&n=`                        |
| `/api/reviews`                         | POST      | Grade an answer; updates FSRS state, log, counters and streak in one D1 batch |
| `/api/placement/{start,answer,finish}` | POST      | Adaptive placement test                                                       |
| `/api/interview/{start,answer,finish}` | POST      | Timed interview session                                                       |
| `/api/streak`                          | GET       | Current and longest streak                                                    |
| `/api/levels`                          | POST      | Manual level override per deck                                                |
| `/api/sandbox/[scenarioId]/step`       | POST      | Advance a sandbox scenario                                                    |

Pages use `load` and form actions rather than these endpoints wherever they can,
so the critical flows work before JavaScript arrives.

## CI/CD

- **Pull request** → `ci.yml`: lint, typecheck, test, build, `content:validate`,
  plus Playwright on both phone viewports.
- **Merge to `main`** → `deploy.yml`: the same gate, then
  `wrangler d1 migrations apply --remote`, `wrangler deploy`, `content:sync --remote`,
  and a smoke check against the live URL.

Production is deployed from CI and nowhere else. No `wrangler deploy` and no
`--remote` migration runs from a laptop.

## Status

**Phase 0 — scaffolding.** The project skeleton, schema, auth, the SRS core and the
content pipeline exist and `npm run check` is green. There is no content yet and
the lesson flow is not built.

See [PLAN.md](PLAN.md) for the roadmap and what is next.

## Attribution

Code is Apache 2.0 — see [LICENSE](LICENSE).

**Content is not covered by that license.** Cards are written from published
certification objectives, official documentation, questions asked publicly on
Reddit, and the author's own paraphrased notes. Nothing verbatim from paid
material; raw course transcripts are gitignored and never committed. Every source
and its terms are listed in
[`content/sources/ATTRIBUTION.md`](content/sources/ATTRIBUTION.md), and the
reasoning is in [ADR 008](docs/adr/008-apache-20-license.md).
