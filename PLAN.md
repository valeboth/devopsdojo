# Plan

Working document. Updated at the end of every phase, alongside the commit that
closes it. The authoritative spec is [`docs/PROMPT-v2.1.md`](docs/PROMPT-v2.1.md);
this file tracks where the build actually is against it.

**Current phase:** 0 — foundation. Complete.
**Next:** Phase 1 — the three modes, on seed content.
**Last updated:** 2026-09-24

---

## Phase 0 — Foundation ✅

Deliverable: a repository that runs locally, GitHub login works, the schema exists
in the local D1, CI is green on a PR.

| #   | Item                                                                                                                                                                      | State                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | SvelteKit skeleton, TS strict, adapter-cloudflare, Tailwind 4, ESLint flat, Prettier, Vitest, Playwright (two mobile projects)                                            | ✅                                                                     |
| 2   | `wrangler.toml` — name, `main` from the adapter, D1 binding `DB`, `nodejs_compat`, `[assets]`                                                                             | ✅ Real `database_id`; migration and seed both applied to the local D1 |
| 3   | Drizzle `schema.ts` (18 tables: §6 + Better Auth), `drizzle.config.ts`, first migration in `drizzle/`                                                                     | ✅                                                                     |
| 4   | Better Auth (GitHub + Google, drizzleAdapter), `hooks.server.ts`, `/api/auth/[...all]`, `allowlist.ts` in `user.create.before`, `/login` with two buttons                 | ✅ GitHub verified against real OAuth; Google unconfigured             |
| 5   | `guards.ts` with `requireUser(event)`                                                                                                                                     | ✅                                                                     |
| 6   | CSP `mode: 'auto'` with strict directives                                                                                                                                 | ✅                                                                     |
| 7   | PWA — manifest, dark theme, `display: standalone`, minimal SW                                                                                                             | ✅ Icons generated from the theme tokens by `scripts/gen-icons.ts`     |
| 8   | `src/lib/srs/` — FSRS + unit tests, including the property tests                                                                                                          | ✅ 21 tests                                                            |
| 9   | `src/lib/cards/schemas.ts` + a test per refinement                                                                                                                        | ✅ 60 tests                                                            |
| 10  | `.dev.vars.example` with every §15 variable                                                                                                                               | ✅                                                                     |
| 11  | `.github/workflows/ci.yml` + `deploy.yml`                                                                                                                                 | ✅ Both green; deploy is live on the custom domain                     |
| 12  | `LICENSE`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PLAN.md`, ADR 001-008, `docs/PROMPT-v2.1.md`, `docs/architecture.md` with the delta note | ✅                                                                     |
| 13  | `seed-dev.ts` — 1 deck, 2 topics, 20 fake cards, local D1 only                                                                                                            | ✅                                                                     |

Extras beyond the phase list, because they were needed to make the above true:
`scripts/content/{validate,stats,translate-check,sync}.ts` (sync is a deliberate
stub), `content/CONTENT-GUIDE.md`, `content/sources/ATTRIBUTION.md`, the issue and
PR templates, `static/favicon.svg`.

**Acceptance:** `npm run check` green — lint, typecheck, 81 unit tests, production
build, `content:validate`. Largest client chunk is 14.2 KB gzip, well inside the
100 KB budget (there is almost no UI yet; the number that matters is Phase 1's).

Closing the gate required four fixes to things that had never actually been run
end to end: `tsconfig.json` needed `allowImportingTsExtensions` (because
`eslint.config.js` imports `vite.config.ts`), `vite.config.ts` had to take
`defineConfig` from `vitest/config` for its `test` block to typecheck,
`scripts/content/validate.ts` imported `cardFile` without using it, and the
dashboard linked to `/learn`, a route that does not exist — SvelteKit's typed
routes rejected it, correctly. The root page now shows the empty streak-0 state
that the phase acceptance actually asks for.

The first CI run then failed the `e2e` job with `No tests found`, because
`tests/e2e/` did not exist — `check` never covered it. Writing
`tests/e2e/smoke.spec.ts` uncovered a real bug rather than a test-harness one:
under `vite preview` **every route returned 500**. adapter-cloudflare gives the
preview server a real `platform.env`, so `hooks.server.ts` builds Better Auth on
every request, and Better Auth throws when `BETTER_AUTH_SECRET` is unset. `vite
dev` never hit it, so `localhost` looked fine. `playwright.config.ts` now hands
`webServer` throwaway credentials (real ones from the shell take precedence), and
all 8 tests pass on both `iphone-se` and `iphone-14`.

CI then failed the same job for a second, unrelated reason: workerd refused to
start with `SQLITE_BUSY: database is locked`. Miniflare backs the D1 binding with
one local SQLite file, and Playwright's default worker count (7 on the runner)
fires enough concurrent requests at startup to kill the runtime, which takes the
whole run with it. Reproduced locally at 7 and at 4 workers, clean at 1 — so the
suite runs with `workers: 1`. The tests take seconds, and the concurrency worth
testing is the app's, not the runner's. If the e2e suite ever grows past a minute,
the fix is a per-worker `--persist-to` directory rather than more workers.

Two things to remember for Phase 1. Anything that runs only under `preview` or on
Workers — not under `vite dev` — needs the env set. And `check` does not run the
e2e suite, so CI is the first place that notices: a local `npm run test:e2e` with a
preview server already up will pass on a config that fails from cold, because
`reuseExistingServer` skips the startup that breaks.

The D1 database now exists. `wrangler.toml` carries the real `database_id`, and the
schema ran for the first time: `db:migrate:local` applied `drizzle/0000_init.sql`
(31 statements) and `seed:dev` wrote 1 deck, 2 topics and 20 cards, confirmed by
counting rows in the local file. The binding stays `DB` — not the `devopsdojo_db`
that `wrangler d1 create` suggests — because `src/lib/server/db/client.ts` reads
`platform.env.DB`.

**The acceptance path is now walked end to end.** With a GitHub OAuth App and
`.dev.vars` in place, `npm run dev` → GitHub login → back signed in works: `user`,
`account` (`provider_id = github`) and `user_profile` each hold the expected row in
the local D1.

Getting there took two bugs that only a real browser could show, both invisible to
`curl` and to the smoke tests as they were. First, `/login` submitted nothing at
all: the pressed button set `submitting` in its own click handler, Svelte applied
`disabled` synchronously, and Chrome cancels a submit whose submitter is disabled
before the default action. No request, no console error, a clean server log — the
button simply did nothing. The label now changes from the form's `onsubmit` and no
button is disabled. Second, `form-action 'self'` would have blocked the next step:
the directive covers a submission's redirect target, so the browser dropped the 303
to GitHub while the server logged a normal 303.

Both now have a test that fails without the fix — one reads the `form-action`
directive off the response, the other asserts a click produces the request to
`github.com/login/oauth/authorize` carrying `state` and `code_challenge`. The old
test only checked that the form existed, which is why it passed throughout.

The lesson for Phase 1: an assertion that an element is present is not an assertion
that it works. Anything a thumb touches needs a test that follows through to the
resulting request.

## Phase 1 — The three modes, on seed content

Deliverable: an MVP usable on a phone, running on `seed:dev` content.

- [ ] Verify the Phase 0 acceptance path end to end once the credentials exist
- [ ] Dashboard (§13)
- [ ] Adaptive placement (§10) + result screen + manual override
- [ ] Courses: deck list, topic list with status, lesson (concept → exercises → recap), sequential unlock, skip
- [ ] Review mode with the §9 selector, all 7 card types rendered and graded
- [ ] Interview mode (§11)
- [ ] Streak service + `StreakBadge`; the 23:59/00:01 `Europe/Bucharest` test
- [ ] Profile: UI language, content language, theme, level retest, interleaving weights
- [ ] Zod on every endpoint input; simple per-user in-isolate rate limit with `Retry-After`
- [ ] E2E: login → placement → lesson → review → streak, on both viewports
- [ ] `EXPLAIN QUERY PLAN` on selection — no full scan on `cards` or `reviews`

Acceptance: PWA installed on the iPhone, placement done, one topic finished, one
review done, streak 1. Initial bundle under 100 KB gzip (report the number).

## Phase 2 — Content pipeline

- [ ] `scripts/sources/`: `whisper-normalize.ts`, `cert-curricula.ts`, `reddit.ts`
- [ ] Implement `content:sync` for real (it currently exits 1 on purpose)
- [ ] First 150 real cards: `00-devops-fundamentals` complete (small) + the first 3 `01-linux` topics, EN, plus a minimum placement pool for both decks
- [ ] `deploy.yml` runs sync in the right order; the user does the first real deploy

Acceptance: live on `devopsdojo.valegboth.win` with real content; running sync
twice is a no-op.

## Phases 3-9

| Phase | Scope                              | Target                                                                                                                                                |
| ----- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | Fundamentals + Linux + Git         | Linux 250+, Git 150+ cards, EN, full placement pool per deck; then RO for `00` and `01`                                                               |
| 4     | App Packages + Docker + Kubernetes | 60+ / 200+ / 300+ (CKAD first, CKA after); `ckad`/`cka` tags; RO at the end                                                                           |
| 5     | Jenkins + Ansible + Terraform/AWS  | 80-100 each, EN; RO after                                                                                                                             |
| 6     | Interview pool + expert tier       | 30+ `interview` cards per main deck; 5 sub-modules × 30-50 expert cards, out of placement                                                             |
| 7     | Polish                             | Real-device testing, accessibility audit, optional Sentry, weekly recap from `review_log`, FSRS calibration on real data — **natural stopping point** |
| 8     | Real sandbox (optional)            | `K3sProvider` over Cloudflare Tunnel to k3s; ADR before any code                                                                                      |
| 9     | Open launch                        | README with screenshots, fork-to-deploy documented, decision on `ALLOWED_EMAILS`                                                                      |

---

## Blockers

Every blocker that gated Phase 0 is closed. What is left is production-only.

1. ~~**D1 `database_id`**~~ — resolved. `devopsdojo-db` exists, `wrangler.toml`
   has its id, and both `db:migrate:local` and `seed:dev` have run against it.
   Integration tests are unblocked.
2. ~~**OAuth credentials**~~ — resolved for local. A GitHub OAuth App exists and
   a real login completed. Google is deliberately unconfigured, so that button
   500s; it is optional (ADR 002 needs one working provider, not both).
3. ~~**Repo secrets**~~ — resolved, and exercised: `deploy.yml` ran green and
   `https://devopsdojo.valegboth.win` serves the app. The token needed
   `Zone:Workers Routes:Edit` on top of Workers Scripts and D1 — without it the
   Worker uploads fine and only the route registration fails.

**Production has no runtime secrets yet.** `wrangler secret list --name devopsdojo`
returns `[]`, so the live site serves its public pages but cannot sign anyone in.
That needs a second GitHub OAuth App (or a second redirect URI on the existing one,
which allows up to ten) plus `wrangler secret put` for `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Secrets take
effect without a redeploy.

The repository is at [valeboth/devopsdojo](https://github.com/valeboth/devopsdojo)
and CI is green on it. Work reaches `main` as a PR: the assistant pushes the branch
and opens the PR, the user merges.

## Deliberate deviations from PROMPT-v2.1

Recorded here rather than silently absorbed, per rule #10.

| Deviation                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle.config.ts` has no `driver: 'd1-http'` (§14 phase 0.3 asks for it)                                  | Migrations are generated offline from `schema.ts` and applied by `wrangler d1 migrations apply`. `d1-http` would need an API token and account id at _generate_ time, which puts credentials in a step that does not need them — and drizzle-kit does not require the driver to generate SQL for the sqlite dialect.                               |
| The deck-level §12.4 rules live in `scripts/content/validate.ts`, not in Zod                                | Zod validates one file at a time. "A published deck needs ≥15 placement cards covering difficulty 1-5" is a statement about a directory, so it cannot be a refinement on a file schema. Per-file rules stayed in Zod, where the API and the UI get them too.                                                                                       |
| `scripts/gen-icons.ts` exists (not in the §5 tree)                                                          | The PWA icons are derived from the `src/app.css` theme tokens instead of being committed as opaque binaries. Changing the accent colour and re-running `npm run icons` keeps the manifest in step with the app.                                                                                                                                    |
| `scripts/content/load.ts` exists (not in the §5 tree)                                                       | `stats`, `sync` and `translate-check` all need "every validated deck and topic". Without it each would re-walk `content/` with its own subtly different idea of ordering and error handling.                                                                                                                                                       |
| Scripts run as `node --import tsx/esm <file>.ts`, not `tsx <file>.ts` (§15 lists `tsx scripts/seed-dev.ts`) | The `tsx` CLI opens an IPC unix socket under `$TMPDIR`, which the development sandbox denies with `EPERM` — so `content:validate`, and therefore `npm run check`, could not run at all. Using tsx as a loader under plain `node` does the same TypeScript stripping with no socket. Same behaviour in CI, one dependency less in the hot path.     |
| `npm run icons` added to the scripts table                                                                  | Needed to regenerate what `gen-icons.ts` produces; not part of `check`.                                                                                                                                                                                                                                                                            |
| `form-action` lists `github.com` and `accounts.google.com` (§7 says strict CSP)                             | The login form 303s to the provider, and `form-action` governs a submission's redirect target as well as its initial POST. Under bare `'self'` the browser drops that redirect silently. Listing the two authorization endpoints is narrower than loosening the directive, and everything else stays `'self'`.                                     |
| `playwright.config.ts` sets `webServer.env` (§15 does not mention it)                                       | Under `vite preview` the adapter supplies a real `platform.env`, so Better Auth initialises and throws without `BETTER_AUTH_SECRET` — every route 500s and the whole e2e suite fails for a reason unrelated to the tests. The fallbacks are throwaway: the anonymous flows never reach a provider, and real values from the shell take precedence. |
| Verbatim documents are in `.prettierignore`                                                                 | `prompt.md`, `arhitecture.md`, their `docs/` copies, `CODE_OF_CONDUCT.md` and `LICENSE` are copies of external text. Letting a formatter rewrite them would produce a diff against the source they were copied from, which is the only reason to keep them verbatim.                                                                               |

## Notes for later

- **`content:sync` exits 1 today.** That is intentional — a half-written sync that
  silently upserts nothing is worse than one that refuses. `deploy.yml` guards the
  call with `hashFiles('content/decks/**/*.json') != ''`, so an empty `content/`
  does not fail a deploy. Both go away in Phase 2.
- **Integration tests do not exist yet.** The local D1 is now migrated and seeded,
  so `tests/integration/` is no longer blocked — it just has not been written. The
  Vitest config already expects the directory.
- **The schema is frozen from Phase 1 on.** After the first real migration is
  applied to production, changes are forward-only: a new migration, never an edit
  to an existing one.
- **Better Auth's own tables are in `schema.ts` by hand.** If Better Auth changes
  its expected shape on a minor upgrade, the migration has to be written by hand
  too. Worth checking its changelog before bumping it.

## What the user has to do

Done: the repository, the D1 database (migrated and seeded), the Cloudflare repo
secrets, a GitHub OAuth App, `.dev.vars`, the custom domain, and a green deploy.
Local development is fully working. What is left needs credentials that are
deliberately outside the sandbox.

1. **Production login.** Add
   `https://devopsdojo.valegboth.win/api/auth/callback/github` as a second redirect
   URI on the OAuth App, then `wrangler secret put` for `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL` (the https one), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   and, if you want it, `ALLOWED_EMAILS`. A separate App keeps prod and laptop
   secrets apart, which is the safer choice if you care.
2. **Google** (optional) — a client plus `…/callback/google`. Until then that
   button 500s by design.
3. Copy the course transcripts into `content/sources/transcripts/` — gitignored,
   and it stays that way.
