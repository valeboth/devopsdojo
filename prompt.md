# devopsdojo — Prompt de implementare pentru Claude Code (v2.1)

> Acest fișier e prompt-ul inițial. Îl citești integral înainte de a scrie orice cod.
> Documentul de arhitectură v2.0 al userului este sursa de viziune; **acest prompt îl
> corectează și îl înlocuiește acolo unde diferă** (vezi §2). Când e conflict, câștigă
> acest prompt. Salvezi acest fișier în repo ca `docs/PROMPT-v2.1.md` la Faza 0.

---

## 0. Rolul tău și regulile de lucru

Ești inginerul principal pe `devopsdojo`. Userul (Valerian, `github.com/valeboth`) e
DevOps intern, lucrează cu tine cum a lucrat pe `github.com/valeboth/cinemate-app` —
copiezi convențiile de acolo (vezi §3). Comunici cu userul în **română**, casual.
Codul, commit-urile, comentariile și documentația tehnică sunt în **engleză**.

**Reguli absolute:**

1. **Lucrezi în faze** (§14). La finalul fiecărei faze: rulezi `npm run check` (lint +
   typecheck + test + build), scrii un rezumat scurt în `PLAN.md` (ce e gata, ce
   urmează, ce blocaje), faci commit, și **te oprești și raportezi** userului. Nu treci
   la faza următoare fără confirmare.
2. **Nu inventezi funcționalități** care nu sunt în acest prompt. Dacă ceva pare
   necesar și lipsește, îl propui în raportul de fază, nu îl implementezi din proprie
   inițiativă.
3. **Întrebi înainte de:** a șterge date din D1 remote, a schimba schema după Faza 1,
   a adăuga o dependență care nu e listată în §4, a schimba orice decizie din §2.
4. **Nu rulezi niciodată** `wrangler d1 execute --remote` sau `wrangler deploy` din
   sesiune. Producția se deployează **doar** prin GitHub Actions la merge în `main`.
   Local folosești exclusiv `--local`.
5. **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
   `test:`, `content:`). Branch-uri: `feat/<scope>`, `content/<deck>`, `fix/<scope>`,
   `docs/<scope>`. Lucrezi pe branch, userul face merge în `main`.
6. **Zero `any`** în cod de producție. TypeScript strict + `noUncheckedIndexedAccess`.
7. **Fiecare decizie arhitecturală** care nu e deja aici → ADR nou în `docs/adr/`
   (format: Context / Decision / Consequences, max 1 pagină).
8. **Repo-ul e public.** Nu comiți niciodată: secrets, `.dev.vars`, transcrierile brute
   (`content/sources/transcripts/` e în `.gitignore`), nimic din cursuri plătite
   verbatim. Vezi §12 pentru etică.
9. **Mobile-first e lege.** Orice componentă UI se testează mental și în Playwright
   la 375×667 înainte de orice altceva. Desktop e „merge și acolo".
10. **Dacă un tool/API de Cloudflare se comportă diferit** de ce scrie aici (versiuni
    se schimbă), verifici documentația oficială curentă, aplici ce e corect, și notezi
    diferența în `PLAN.md`. Nu ghicești.

---

## 1. Ce construim (viziune, pe scurt)

Aplicație web publică, PWA, **mobile-first, fără limitări**, care te duce de la
0 la senior DevOps prin micro-lecții, repetiție spațiată (FSRS) și interleaving între
module. Trei moduri pe dashboard:

- **Test nivel** — placement adaptiv care setează nivelul per modul.
- **Interviuri** — mod cronometrat cu întrebări reale de interviu.
- **Cursuri** — buclă Duolingo: concept scurt + 3-7 exerciții + recap.

Curriculum cu 10 module ordonate (DevOps Fundamentals → Linux → Git → App Packages →
Docker → Kubernetes+YAML+Helm → Jenkins → Ansible → Terraform+AWS → Expert tier),
fiecare ancorat la o certificare reală (LPIC, CKAD/CKA, DCA, Jenkins Engineer,
Terraform Associate, AWS DevOps Pro etc.).

**Gamification: doar streak.** Fără XP, inimi, ligi, gating, notificări push.

**Cost lunar: $0.** Totul pe Cloudflare free tier. Open-source, Apache 2.0.

Non-goals v1: app nativă, social/leaderboard, AI tutor la runtime, mod offline,
editor de cod pe telefon, terminal interactiv, Pulumi, LPIC-3.

---

## 2. Decizii blocate (diferențe față de arhitectura v2.0)

Acestea au fost discutate și decise. Nu le redeschizi.

| # | Decizie | Motiv |
|---|---------|-------|
| D1 | **SvelteKit only**, fără Hono. API-ul e în `src/routes/api/**/+server.ts` + `load`/form actions. | O singură piesă de infrastructură. Hono ar dubla `+server.ts`. |
| D2 | **Un singur Worker** cu `@sveltejs/adapter-cloudflare` (SSR + static assets). Fără Cloudflare Pages. | CF recomandă Workers pentru proiecte noi; adapter-ul oricum țintește Workers. |
| D3 | **Auth OAuth-only** (GitHub + Google) prin Better Auth. **Fără parolă.** | Workers free = 10 ms CPU/request; scrypt/bcrypt depășesc limita. |
| D4 | **Allowlist de emailuri** prin env `ALLOWED_EMAILS` (CSV). Gol = înregistrare publică. **Fără Cloudflare Zero Trust Access** în fața app-ului. | Dublă autentificare pe mobil e fricțiune. Access rămâne doar pentru homelab (faza 8). |
| D5 | **Sesiuni în D1** (Better Auth). **Fără KV, fără R2** în v1. | KV free = 1.000 scrieri/zi + eventual consistency. R2 nu e necesar cu SVG inline. |
| D6 | **FSRS** (`ts-fsrs`) în loc de SM-2, plus tabel `review_log` append-only. | Retenție mai bună, permite recap săptămânal și recalibrare. |
| D7 | Cardul are **doar `difficulty` 1-5**; `level` e derivat (1-2 junior, 3 mid, 4 senior, 5 expert). | Două axe pentru același lucru = confuzie la autor. |
| D8 | **Placement adaptiv**: ~3-4 întrebări/modul, pornind de la difficulty 3, ~30 întrebări total, 10-15 min. | 40-50 în 5-10 min e imposibil pentru fill/log-tap; 4-5/modul dă scor zgomotos. |
| D9 | **Conținut bilingv EN + RO**, cu **EN canonic** și RO ca traducere în tabele `*_i18n`. Fallback la EN. | Certificările/interviurile sunt EN; RO vine ca job batch, nu dublează efortul manual. |
| D10 | **Sandbox simulat** în v1: snapshot-uri deterministice JSON. Interfață `SandboxProvider` cu `SimulatedProvider` acum, `K3sProvider` stub pentru faza 8. | Zero infra, zero risc, același UX pe telefon. |
| D11 | **Surse de conținut:** transcrierile Whisper ale userului, docs oficiale, syllabi de certificare publice, Reddit prin API oficial. **Fără Glassdoor, fără KodeKloud scraping, YouTube best-effort.** | ToS + anti-bot + conținut plătit. |
| D12 | **Conținutul intră în D1 prin `content:sync` idempotent**, nu prin migrații. Migrațiile sunt doar pentru schemă. | PR-urile de conținut nu ating schema. |
| D13 | **ID-uri de conținut = slug-uri stabile** (`linux.permissions.chmod-basics-01`). ULID doar pentru users/sessions/logs. | Upsert idempotent, diff lizibil în PR. |
| D14 | **Target conținut v1: 800-1.200 carduri**, prioritate Linux / Git / Docker / Kubernetes. Celelalte module 50-100 fiecare. | Validarea umană e bottleneck-ul. |
| D15 | Generarea conținutului e **LLM-asistată (tu, în sesiune) + review uman**. **Zero LLM la runtime.** | Clarificare a „fără LLM în v1". |
| D16 | Tabelul de sesiuni de studiu se numește **`study_sessions`**. | Better Auth are propriul tabel `session`. |
| D17 | **npm**, nu pnpm. | Consistență cu Cinemate și cu CI-ul deja cunoscut. |
| D18 | **Roadmap în milestones**, nu zile. | Userul are job full-time. |
| D19 | PWA = manifest + install prompt + SW **minimal** (fără precache API, fără offline). | `vite-pwa` default cache-uiește agresiv → conținut vechi. |
| D20 | **Fără Sentry** până la faza 7. Cloudflare Workers Logs + `console.error` structurat până atunci. | O piesă mai puțin la start. |

---

## 3. Convenții preluate din Cinemate (obligatorii)

Repo de referință: `https://github.com/valeboth/cinemate-app`. Ce copiem 1:1 ca
principiu:

- **Același origin**: Worker-ul servește frontend-ul și `/api/*`. Fără CORS.
- **`PLAN.md` la root**, actualizat la fiecare fază (status, roadmap, blocaje).
- **`.dev.vars.example`** commitat, `.dev.vars` în `.gitignore`.
- **`wrangler.toml`** la root (un singur fișier, nu și în `infra/`).
- **ESLint flat config** (`eslint.config.js`) + Prettier + Vitest.
- **npm scripts** cu aceleași nume unde are sens: `dev`, `lint`, `typecheck`, `build`,
  `test`, `check` (toate la un loc), `deploy`, `db:migrate:local`, `db:migrate:remote`.
- **CI/CD:**
  - PR → `main`: `lint` + `typecheck` + `test` + `build` + `content:validate`.
  - push → `main`: un singur job care rulează `wrangler d1 migrations apply --remote`,
    apoi `content:sync --remote`, apoi `wrangler deploy`.
  - Secrets în GitHub: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **Secrets de runtime** cu `wrangler secret put`, niciodată în repo. Cheile nu ajung
  în frontend — browserul vorbește doar cu Worker-ul.
- **README** cu secțiunile: Features, Stack (tabel), Project layout, Local setup,
  Secrets/env (tabel), npm scripts (tabel), API routes, CI/CD, Status, Attribution.

Diferențe față de Cinemate (intenționate): SvelteKit în loc de vanilla HTML/JS;
Drizzle + migrații generate în loc de `schema.sql` unic; Better Auth în loc de
„simple auth"; fără Durable Objects, fără KV.

---

## 4. Stack tehnic (versiuni pinned la 2026-09-23; verifică ultimele minor)

| Layer | Alegere |
|-------|---------|
| Runtime | Node 20 LTS (dev), Cloudflare Workers (prod) |
| Framework | SvelteKit 2.x, Svelte 5 (runes) |
| Adapter | `@sveltejs/adapter-cloudflare` |
| Stil | Tailwind CSS 4 (CSS-first, fără `tailwind.config.ts`) + `@tailwindcss/forms` via `@plugin` |
| DB | Cloudflare D1 |
| ORM | Drizzle ORM (`drizzle-orm/d1`) + `drizzle-kit` pentru migrații |
| Validare | Zod |
| Auth | `better-auth` cu `drizzleAdapter(db, { provider: 'sqlite' })`, `socialProviders: { github, google }` |
| SRS | `ts-fsrs` |
| ID-uri | `ulid` (users, study_sessions, review_log) |
| Markdown | `marked` + `DOMPurify` (isomorphic) pentru `concept_md` și explicații |
| PWA | `@vite-pwa/sveltekit` cu strategie `generateSW`, `navigateFallback: null`, fără runtime caching pe `/api` |
| Test unit | Vitest |
| Test E2E | Playwright (proiecte `iphone-se` 375×667 și `iphone-14` 390×844) |
| Lint | ESLint 9 flat + `eslint-plugin-svelte` + Prettier 3 + `prettier-plugin-svelte` |
| CLI | Wrangler 4 |
| CI | GitHub Actions |
| Licență | Apache 2.0 |

**Nu adaugi** alte dependențe fără să întrebi. Excepții permise fără întrebare:
`@types/*`, `vite-plugin-*` necesare adapter-ului, utilitare Svelte oficiale.

---

## 5. Structura proiectului

```
devopsdojo/
├── README.md · LICENSE · CONTRIBUTING.md · CODE_OF_CONDUCT.md · SECURITY.md · PLAN.md
├── package.json · package-lock.json · tsconfig.json
├── wrangler.toml · svelte.config.js · vite.config.ts · drizzle.config.ts
├── eslint.config.js · .prettierrc · .gitignore · .dev.vars.example
├── playwright.config.ts · vitest.config.ts
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # PR: lint, typecheck, test, build, content:validate
│   │   └── deploy.yml             # push main: migrate → content:sync → deploy
│   ├── ISSUE_TEMPLATE/ (bug.md, feature.md, content.md)
│   └── PULL_REQUEST_TEMPLATE.md
│
├── drizzle/                       # migrații SQL generate de drizzle-kit (commit-uite)
│
├── src/
│   ├── app.html · app.css · app.d.ts
│   ├── hooks.server.ts            # attach session la event.locals, CSP nonce
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/  (schema.ts, client.ts)
│   │   │   ├── auth/ (better-auth.ts, guards.ts, allowlist.ts)
│   │   │   ├── content/ (queries.ts — carduri, topics, decks cu i18n fallback)
│   │   │   ├── reviews/ (repository.ts)
│   │   │   ├── placement/ (engine.ts, scorer.ts)
│   │   │   ├── interleaving/ (selector.ts)
│   │   │   ├── interview/ (session.ts)
│   │   │   ├── streak/ (service.ts)
│   │   │   └── sandbox/ (provider.ts, simulated.ts, k3s.stub.ts)
│   │   ├── srs/ (fsrs.ts, grading.ts, types.ts)         # pur, fără I/O, testat 100%
│   │   ├── cards/ (schemas.ts, validate.ts, types.ts)    # Zod per tip de card
│   │   ├── i18n/ (index.ts, ro.ts, en.ts)                # stringuri UI
│   │   ├── client/
│   │   │   ├── stores/ (session.svelte.ts, settings.svelte.ts)
│   │   │   ├── components/
│   │   │   │   ├── cards/ (ChoiceCard, MultiCard, OrderCard, MatchCard, FillCard, LogTapCard, SwipeCard).svelte
│   │   │   │   ├── lesson/ (ConceptBlock, ExerciseFrame, Recap).svelte
│   │   │   │   ├── placement/ (PlacementRunner, LevelResult).svelte
│   │   │   │   ├── interview/ (Timer, InterviewSetup, InterviewScore).svelte
│   │   │   │   ├── sandbox/ (ScenarioRunner, TerminalSnapshot).svelte
│   │   │   │   └── ui/ (Button, StreakBadge, ProgressBar, BottomNav, Skeleton, Toast).svelte
│   │   │   └── utils/ (haptic.ts, format.ts, markdown.ts)
│   │   └── shared/ (types.ts, constants.ts)
│   └── routes/
│       ├── +layout.svelte · +layout.server.ts
│       ├── +page.svelte · +page.server.ts             # dashboard
│       ├── login/
│       ├── onboarding/placement/
│       ├── decks/ · decks/[slug]/
│       ├── lesson/[deck]/[topic]/
│       ├── review/
│       ├── interview/ · interview/[sessionId]/
│       ├── sandbox/[scenarioId]/
│       ├── profile/
│       └── api/
│           ├── auth/[...all]/+server.ts               # Better Auth handler
│           ├── cards/next/+server.ts                  # selecție pentru sesiune (lesson/review)
│           ├── reviews/+server.ts                     # POST grade
│           ├── placement/{start,answer,finish}/+server.ts
│           ├── interview/{start,answer,finish}/+server.ts
│           ├── streak/+server.ts
│           ├── levels/+server.ts                      # override manual
│           └── sandbox/[scenarioId]/step/+server.ts
│
├── content/                       # SURSA ADEVĂRULUI pentru conținut (JSON, versionat)
│   ├── decks/
│   │   ├── 00-devops-fundamentals/ (deck.json, topics/*.json)
│   │   ├── 01-linux/ · 02-git/ · 03-app-packages/ · 04-docker/ · 05-kubernetes/
│   │   ├── 06-jenkins/ · 07-ansible/ · 08-terraform-aws/
│   │   └── 09-expert/ (observability/, security/, networking/, sre/, cicd-patterns/)
│   ├── scenarios/                 # sandbox simulat
│   ├── placement/pool.json        # referințe la card-id-uri tagate `placement`
│   ├── sources/
│   │   ├── transcripts/           # GITIGNORED — copie locală a transcrierilor Whisper
│   │   ├── notes/                 # extrase normalizate (fapte, comenzi) — commitabile
│   │   └── ATTRIBUTION.md
│   └── CONTENT-GUIDE.md           # cum scrii un card bun, checklist de review
│
├── scripts/
│   ├── content/
│   │   ├── validate.ts            # Zod pe tot content/, lint (§12.4)
│   │   ├── sync.ts                # generează SQL upsert idempotent → wrangler d1 execute
│   │   ├── stats.ts               # carduri per deck/topic/type/difficulty/lang
│   │   └── translate-check.ts     # ce carduri nu au RO
│   ├── sources/
│   │   ├── whisper-normalize.ts   # .txt/.srt/.vtt → notes/*.md (fapte, comenzi, greșeli)
│   │   ├── reddit.ts              # API oficial, subreddituri țintă, salvează în notes/
│   │   └── cert-curricula.ts      # syllabi publice → checklist per modul
│   └── seed-dev.ts                # user + progres fictiv pentru dev local
│
├── tests/
│   ├── unit/ (srs, cards, placement, interleaving, streak, sync)
│   ├── integration/ (api.test.ts cu D1 local via wrangler/miniflare)
│   └── e2e/ (login, placement, lesson-flow, review-flow, interview-flow, mobile-ux).spec.ts
│
└── docs/
    ├── PROMPT-v2.1.md             # acest fișier
    ├── architecture.md            # v2.0 al userului, cu notă „vezi PROMPT-v2.1 pentru delta"
    ├── data-model.md · content-pipeline.md · curriculum.md · deployment.md
    └── adr/
        ├── 001-sveltekit-only-no-hono.md
        ├── 002-oauth-only-no-password.md
        ├── 003-fsrs-over-sm2.md
        ├── 004-i18n-tables-en-canonical.md
        ├── 005-simulated-sandbox-v1.md
        ├── 006-content-sync-not-migrations.md
        ├── 007-streak-only-gamification.md
        └── 008-apache-20-license.md
```

---

## 6. Model de date (Drizzle → D1)

Definești în `src/lib/server/db/schema.ts` cu Drizzle și generezi migrațiile cu
`drizzle-kit generate`. Mai jos e DDL-ul de referință; Drizzle trebuie să producă
echivalentul.

**Better Auth** își aduce propriile tabele (`user`, `session`, `account`,
`verification`) — le generezi cu CLI-ul Better Auth în același `schema.ts`. Tabelele
noastre referențiază `user.id`.

```sql
-- Profil aplicație (extinde user-ul Better Auth)
CREATE TABLE user_profile (
  user_id        TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  display_name   TEXT,
  timezone       TEXT NOT NULL DEFAULT 'Europe/Bucharest',
  ui_lang        TEXT NOT NULL DEFAULT 'ro',          -- 'ro' | 'en'
  content_lang   TEXT NOT NULL DEFAULT 'ro',          -- 'ro' | 'en' (fallback en)
  settings_json  TEXT NOT NULL DEFAULT '{}',          -- interleaving weights override etc.
  placement_done INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  last_seen_at   INTEGER
);

-- Module (decks) — conținut, ID = slug
CREATE TABLE decks (
  id          TEXT PRIMARY KEY,                       -- 'linux'
  order_idx   INTEGER NOT NULL,
  cert_target TEXT,                                   -- 'LPIC-1,LPIC-2'
  published   INTEGER NOT NULL DEFAULT 0,
  is_expert   INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE deck_i18n (
  deck_id     TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (deck_id, lang)
);

-- Topic-uri — ID = 'linux.permissions'
CREATE TABLE topics (
  id         TEXT PRIMARY KEY,
  deck_id    TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES topics(id),
  order_idx  INTEGER NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_topics_deck ON topics(deck_id, order_idx);
CREATE TABLE topic_i18n (
  topic_id   TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  lang       TEXT NOT NULL,
  name       TEXT NOT NULL,
  concept_md TEXT NOT NULL,
  recap_md   TEXT,
  PRIMARY KEY (topic_id, lang)
);

-- Carduri — ID = 'linux.permissions.chmod-basics-01'
CREATE TABLE cards (
  id          TEXT PRIMARY KEY,
  topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,        -- choice|multi|order|match|fill|log_tap|swipe
  difficulty  INTEGER NOT NULL,     -- 1..5 ; level derivat în cod
  source      TEXT,                 -- 'whisper:lesson-12' | 'reddit:<id>' | 'cert:CKAD:3.2' | 'docs:kubernetes.io/...'
  source_url  TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,   -- scos din content/ → nu se șterge, se arhivează
  content_hash TEXT NOT NULL,               -- hash al JSON-ului sursă, pentru sync diff
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_cards_topic ON cards(topic_id, difficulty);
CREATE TABLE card_i18n (
  card_id      TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  lang         TEXT NOT NULL,
  prompt       TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  answer_json  TEXT NOT NULL,       -- include explanation
  PRIMARY KEY (card_id, lang)
);
CREATE TABLE card_tags (
  card_id  TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,           -- 'interview' | 'placement' | 'cka' | 'ckad' | 'hands-on' | ...
  PRIMARY KEY (card_id, tag)
);
CREATE INDEX idx_card_tags_tag ON card_tags(tag);

-- Nivel per modul (output placement / override)
CREATE TABLE user_deck_levels (
  user_id  TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  deck_id  TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  level    TEXT NOT NULL,           -- junior|mid|senior
  score    INTEGER,                 -- 0..100
  source   TEXT NOT NULL,           -- placement|manual|inferred
  set_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, deck_id)
);

-- Stare FSRS per card per user
CREATE TABLE reviews (
  user_id        TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  card_id        TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  due            INTEGER NOT NULL,          -- unix ms
  stability      REAL NOT NULL,
  difficulty     REAL NOT NULL,
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  state          INTEGER NOT NULL DEFAULT 0, -- ts-fsrs State enum
  last_review    INTEGER,
  total_reviews  INTEGER NOT NULL DEFAULT 0,
  correct_count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX idx_reviews_due ON reviews(user_id, due);

-- Log append-only (recap, recalibrare, debug)
CREATE TABLE review_log (
  id          TEXT PRIMARY KEY,      -- ulid
  user_id     TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL,
  session_id  TEXT,
  rating      INTEGER NOT NULL,      -- ts-fsrs Rating 1..4
  correct     INTEGER NOT NULL,      -- 0|1 (autograde)
  elapsed_ms  INTEGER,
  mode        TEXT NOT NULL,         -- lesson|review|interview|placement|sandbox
  reviewed_at INTEGER NOT NULL
);
CREATE INDEX idx_review_log_user_time ON review_log(user_id, reviewed_at);

-- Progres pe topic (deblocare secvențială în Cursuri)
CREATE TABLE user_topic_progress (
  user_id      TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  topic_id     TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,        -- locked|available|in_progress|completed|skipped
  completed_at INTEGER,
  PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE streaks (
  user_id          TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  longest_streak   INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT                -- 'YYYY-MM-DD' în timezone-ul userului
);

CREATE TABLE study_sessions (
  id            TEXT PRIMARY KEY,     -- ulid
  user_id       TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL,        -- lesson|review|interview|placement|sandbox
  deck_id       TEXT REFERENCES decks(id),
  topic_id      TEXT REFERENCES topics(id),
  config_json   TEXT NOT NULL DEFAULT '{}',   -- interview: stack, difficulty, duration; placement: state adaptiv
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  cards_seen    INTEGER NOT NULL DEFAULT 0,
  cards_correct INTEGER NOT NULL DEFAULT 0,
  result_json   TEXT                  -- scor per deck la final (interview/placement)
);
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id, started_at);
```

**Reguli:**
- Toate timpurile `INTEGER` unix ms, UTC. Timezone-ul userului se aplică doar la
  calculul zilei de streak.
- **Nu ștergi carduri** din D1 la sync; le arhivezi. Review state-ul userilor rămâne.
- Bugetul D1 free: 5M rânduri citite/zi, 100k scrise/zi. Orice query care poate
  scana `cards` fără index se rescrie. `EXPLAIN QUERY PLAN` pe query-urile de selecție
  în Faza 1.

---

## 7. Formatul conținutului (JSON în `content/`)

### 7.1 `deck.json`
```json
{
  "id": "linux",
  "order": 1,
  "cert_target": "LPI Linux Essentials, LPIC-1, LPIC-2",
  "published": true,
  "i18n": {
    "en": { "title": "Linux", "description": "Filesystem, permissions, processes, networking, shell." },
    "ro": { "title": "Linux", "description": "Filesystem, permisiuni, procese, networking, shell." }
  }
}
```

### 7.2 `topics/<slug>.json` (un topic = concept + carduri)
```json
{
  "id": "linux.permissions",
  "order": 4,
  "published": true,
  "i18n": {
    "en": { "name": "Permissions", "concept_md": "...", "recap_md": "..." },
    "ro": { "name": "Permisiuni", "concept_md": "...", "recap_md": "..." }
  },
  "cards": [
    {
      "id": "linux.permissions.chmod-basics-01",
      "type": "choice",
      "difficulty": 2,
      "tags": ["lpic-1", "placement"],
      "source": "cert:LPIC-1:104.5",
      "source_url": "https://www.lpi.org/...",
      "i18n": {
        "en": {
          "prompt": "Minimum permission for a script executable only by its owner?",
          "payload": { "options": [{"id":"a","text":"644"},{"id":"b","text":"700"},{"id":"c","text":"755"},{"id":"d","text":"777"}] },
          "answer": { "correct_option_id": "b", "explanation": "7 = rwx for owner, 0 for group and others." }
        },
        "ro": { "...": "..." }
      }
    }
  ]
}
```

**Reguli de conținut:**
- `i18n.en` e **obligatoriu**; `i18n.ro` opțional (fallback la EN la runtime, iar
  `translate-check.ts` raportează ce lipsește).
- Comenzi, flag-uri, nume de resurse, output-uri de log **nu se traduc**.
- `explanation` obligatorie, `source` obligatoriu, minim 1 tag.
- Cardurile cu tag `placement` trebuie să aibă `difficulty` distribuit 1-5 în fiecare deck.
- Cardurile cu tag `interview` au în plus `source_url` obligatoriu.

### 7.3 Payload/answer per tip (Zod în `src/lib/cards/schemas.ts`)

| Tip | payload | answer |
|-----|---------|--------|
| `choice` | `options[4]{id,text}` | `correct_option_id`, `explanation` |
| `multi` | `options[4-6]` | `correct_option_ids[2-4]`, `explanation` |
| `order` | `items[3-7]{id,text}` | `correct_order: id[]`, `explanation` |
| `match` | `left[]`, `right[]` (3-5 perechi) | `pairs[]{left_id,right_id}`, `explanation` |
| `fill` | `before`, `after?`, `hint?` (răspuns max 30 char) | `correct: string[]`, `case_sensitive`, `explanation` |
| `log_tap` | `log` (8-15 linii), `hint?` | `target_line_substring` (unic în log), `explanation` |
| `swipe` | `front`, `back` | — (grad manual) |

Zod refinements: `log_tap.target_line_substring` apare exact o dată în `log`;
`choice.correct_option_id` există în `options`; `order` fără duplicate; `fill.correct`
non-gol și fiecare variantă ≤ 30 char.

### 7.4 Scenarii sandbox (`content/scenarios/<id>.json`)
```json
{
  "id": "k8s.broken-pod.imagepullbackoff-01",
  "deck_id": "kubernetes",
  "difficulty": 3,
  "i18n": { "en": { "title": "Pod stuck in ImagePullBackOff", "context_md": "..." }, "ro": {} },
  "steps": [
    {
      "id": "s1",
      "snapshot": { "command": "kubectl get pods -n shop", "output": "NAME  READY STATUS ...\napi-7d9f 0/1 ImagePullBackOff ..." },
      "card": { "type": "choice", "i18n": { "en": { "prompt": "What do you run next?", "payload": {}, "answer": {} } } }
    },
    {
      "id": "s2",
      "snapshot": { "command": "kubectl describe pod api-7d9f -n shop", "output": "..." },
      "card": { "type": "log_tap", "i18n": {} }
    }
  ],
  "resolution": { "command": "kubectl set image deploy/api api=shop/api:1.4.2 -n shop", "output_after": "api-7d9f 1/1 Running" }
}
```
Userul nu scrie comenzi; alege/atinge. La final vede `resolution` „aplicată".
`SandboxProvider` are `start(scenarioId)`, `step(sessionId, stepId, answer)`,
`finish(sessionId)`. `SimulatedProvider` citește din D1/JSON. `K3sProvider` aruncă
`NotImplemented` cu TODO către faza 8.

---

## 8. SRS — FSRS și gradare

`src/lib/srs/` e **pur** (fără I/O), testat la 100%.

**Grading pe mobil (3 butoane, mapare la `ts-fsrs` Rating):**

| Card | Cum se gradează |
|------|-----------------|
| Autogradabile (`choice`, `multi`, `order`, `match`, `fill`, `log_tap`) | greșit → `Again`; corect → `Good`; corect + user apasă „A fost greu" → `Hard`. `Easy` nu se folosește în v1. |
| `swipe` | 3 butoane: Nu știam → `Again`, Greu → `Hard`, Știam → `Good`. |

**Flow la răspuns:** `POST /api/reviews` cu `{card_id, rating, correct, elapsed_ms, session_id, mode}` →
1. Încarcă `reviews` row (sau `createEmptyCard`).
2. `fsrs().repeat(card, now)[rating]` → noul state.
3. Upsert `reviews`, insert `review_log`, update `study_sessions` counters, update streak.
4. Răspuns: `{ next_due, explanation }`.
Toate în **un singur D1 batch** (`db.batch([...])`).

**Mode `interview` și `placement` NU ating `reviews`** — doar `review_log` +
`study_sessions`.

**Weak spot** = `total_reviews >= 3 AND correct_count / total_reviews < 0.7` SAU
`due < now - 1 zi`.

---

## 9. Selecția cardurilor (interleaving)

`src/lib/server/interleaving/selector.ts`, apelat de `GET /api/cards/next?mode=&deck=&topic=&n=`.

**Lesson mode** (user e pe topic-ul `T` din modulul `M`), `n = 3..7` per topic:

| Sursă | Pondere |
|-------|---------|
| Carduri noi din `T` (nevăzute, filtrate pe nivelul userului pe `M`) | 50% |
| Carduri noi din `M-1` | 15% |
| Carduri noi din `M-2` | 10% |
| SRS due / weak spots din orice modul | 25% |

Fallback: dacă `M-1`/`M-2` nu există sau nu au carduri eligibile, ponderea lor merge
la SRS due; dacă nici SRS nu are, la `T`. Ponderile sunt override-abile din
`user_profile.settings_json.interleaving` (setări → „Amestecă tot" = 50/0/0/50).

**Review mode:** toate cardurile `due <= now`, ordonate după `due`. Dacă < 20 →
completează cu weak spots. Dacă tot < 20 → carduri noi din topic-uri `available`
ale modulului curent.

**Filtrare pe nivel** (`user_deck_levels.level`):

| Nivel | difficulty afișat |
|-------|-------------------|
| junior | 1-3 |
| mid | 2-4 |
| senior | 3-5 |
| lipsă (fără placement) | 1-3 |

---

## 10. Placement adaptiv

`src/lib/server/placement/engine.ts`. State-ul sesiunii adaptive stă în
`study_sessions.config_json`.

1. Pool = carduri cu tag `placement`, tipuri `choice`/`fill`/`log_tap` (50/30/20).
2. Pentru fiecare deck publicat, non-expert, în ordine: începe la `difficulty 3`.
   Corect → următoarea la `+1` (max 5). Greșit → `-1` (min 1). **3 întrebări/deck**,
   a 4-a doar dacă rezultatele sunt contradictorii (ex. 3 corect, 5 greșit → mai pui una la 4).
3. Ordinea deck-urilor e **interleaved**, nu bloc: L1, G1, D1, K1, L2, G2, ... (o
   întrebare din fiecare, apoi a doua din fiecare).
4. Scor per deck = suma `difficulty` la corecte / suma `difficulty` la toate, ×100.
5. Mapare: `< 50` junior, `50-75` mid, `> 75` senior.
6. Ecran rezultat: nivel per modul, buton „Modifică" per modul cu confirm dialog →
   `source='manual'`. Salvare în `user_deck_levels`, `user_profile.placement_done=1`.
7. Timp per întrebare nelimitat. Bară de progres. Se poate abandona — la revenire
   reia din `config_json`.
8. „Retest nivel" din profil rulează același flow și suprascrie doar deck-urile cu
   `source != 'manual'` (manualul câștigă, cu opțiune de reset).

---

## 11. Interview mode

1. Setup: stack (per deck sau `mixed`), nivel (junior/mid/senior), durată (10/20/30 min).
2. Pool: carduri cu tag `interview` + filtrele alese. Fallback la carduri normale cu
   `difficulty` corespunzător dacă pool-ul e < 15 carduri (afișezi un avertisment „pool mic").
3. Timer global vizibil + timer per întrebare (60 s default, 90 s pentru `order`/`log_tap`).
   Expirare = greșit, se arată explicația.
4. La final: scor total, breakdown pe deck, top 3 arii slabe cu link către topic-ul
   corespunzător din Cursuri. Salvare în `study_sessions.result_json`.
5. Nu atinge `reviews`. Scrie `review_log` cu `mode='interview'`.

---

## 12. Pipeline de conținut

### 12.1 Surse și unde ajung
- **Transcrieri Whisper** — userul le copiază din
  `/Users/valerian.both/Downloads/devops-video/_transcripts` în
  `content/sources/transcripts/` (gitignored). `whisper-normalize.ts` produce
  `content/sources/notes/<deck>/<lesson>.md` cu structura: `## Concepts`, `## Commands`,
  `## Common mistakes`, `## Interview-worthy`. Notes-urile sunt fapte parafrazate, commitabile.
- **Syllabi de certificare** (publice): `cert-curricula.ts` produce
  `content/sources/notes/cert-<name>.md` cu obiectivele ca checklist. Servesc drept
  **hartă de acoperire** per modul (`stats.ts` raportează câte carduri ai per obiectiv).
- **Docs oficiale**: nu se scrapează în masă. Se citează cu `source_url` la nivel de card.
- **Reddit**: `reddit.ts` cu API oficial (OAuth app, `REDDIT_CLIENT_ID/SECRET` în
  `.dev.vars`), subreddituri: devops, kubernetes, docker, jenkinsci, ansible, terraform,
  sysadmin, cscareerquestions (filtrat „devops interview"). Salvează în
  `notes/reddit/<subreddit>-<yyyymm>.md` doar: titlu, URL, rezumat parafrazat al
  întrebării. Fără text verbatim de la useri.
- **Fără** Glassdoor, KodeKloud scraping. YouTube: doar dacă userul îți dă transcript-ul.

### 12.2 Generare carduri (tu, în sesiune)
Când userul spune „generează carduri pentru `<topic>`":
1. Citești `notes/` relevante + obiectivele cert pentru topic.
2. Scrii `concept_md` (EN, 1-2 paragrafe, max 150 cuvinte, cod în bloc) și `recap_md`.
3. Generezi **5-12 carduri** cu mix de tipuri (min 3 tipuri diferite), difficulty
   distribuit, fiecare cu `source` și `explanation`. Explicația spune **de ce**, nu
   repetă răspunsul.
4. Rulezi `npm run content:validate`. Corectezi.
5. Raportezi userului: lista cardurilor (prompt + răspuns, o linie fiecare) pentru review.
6. După OK, commit `content(<deck>): add <topic> (<n> cards)` pe `content/<deck>`.

Traducerea RO: task separat, „tradu topic-ul `<id>`" → completezi `i18n.ro` respectând
regula „comenzile nu se traduc", PR separat `content(<deck>): ro translation for <topic>`.

### 12.3 Definition of done per topic
`concept_md` EN + `recap_md` EN + minim 5 carduri validate + fiecare obiectiv cert
mapat pe topic are ≥ 1 card + `stats.ts` verde.

### 12.4 `content:validate` verifică
- Zod pe fiecare fișier + refinements din §7.3.
- ID-uri unice global, prefixate corect cu `deck.topic.`.
- Prompt ≤ 200 char, opțiune ≤ 80 char, `concept_md` ≤ 1.500 char.
- Opțiuni nu sunt duplicate (normalizat lowercase/trim).
- `explanation` ≥ 20 char și ≠ textul opțiunii corecte.
- Fiecare topic publicat are ≥ 5 carduri.
- Fiecare deck publicat are ≥ 15 carduri `placement` cu difficulty 1-5 acoperit.
- `ro` dacă există, are aceeași structură de ID-uri în payload ca `en`.

### 12.5 `content:sync`
- Citește tot `content/`, calculează `content_hash` per card, compară cu D1
  (`SELECT id, content_hash FROM cards`), generează SQL doar pentru diff:
  `INSERT ... ON CONFLICT(id) DO UPDATE` pentru decks/topics/cards/i18n/tags,
  `UPDATE cards SET archived=1` pentru ID-uri dispărute din content.
- Scrie SQL-ul în `.sync/<timestamp>.sql`, îl aplică cu
  `wrangler d1 execute devopsdojo-db --local|--remote --file`.
- Idempotent: rulat de două ori = a doua rulare nu schimbă nimic.
- În CI rulează cu `--remote` **numai** în `deploy.yml`.

### 12.6 Etică
- Extragem fapte: concepte, comenzi, pattern-uri, greșeli frecvente. Nu propoziții.
- Cursuri plătite (inclusiv transcrierile Whisper ale userului): doar fapte parafrazate
  în `notes/`; transcrierile brute nu intră în repo.
- `ATTRIBUTION.md` listează fiecare sursă folosită cu licența/ToS-ul ei.

---

## 13. UX mobile-first (reguli non-negociabile)

- Tap targets ≥ 44×44 px (țintă 48-52). Body ≥ 16 px, meta ≥ 14 px.
- Fără hover ca singur mod de interacțiune. Vertical scroll only.
- Acțiunile principale în jumătatea de jos a ecranului. `BottomNav` cu 3 iteme:
  Acasă / Review / Profil.
- `navigator.vibrate(10)` la corect/greșit/streak (guarded, e no-op pe iOS).
- Skeleton loaders, nu spinner blocant. Fiecare `load` are `+page.server.ts` +
  streaming unde are sens.
- Dark mode default, light mode din setări. Tokens în `app.css` (`--bg`, `--fg`,
  `--accent`, `--ok`, `--err`, `--warn`), `data-theme` pe `html`.
- Microinteracțiuni: apăsare `scale(0.97)` 100 ms; corect = flash verde + haptic;
  greșit = shake 200 ms + roșu + explicația se deschide sub card.
- Fiecare tip de card are stare `idle → answered → revealed`. `revealed` arată
  explicația + butonul „A fost greu" (dacă corect) + „Următorul".
- `safe-area-inset-*` respectate (PWA pe iPhone cu notch).
- Playwright rulează **fiecare** flow critic pe `iphone-se` și `iphone-14`.

**Dashboard:** header cu streak + profil; trei carduri mari (Test nivel / Interviuri /
Cursuri cu „Continuă: <deck> › <topic>" + progres `Module x/10`); card „Review azi: N
carduri, ~M min" cu buton Start.

**Lecție:** breadcrumb `◀ Deck › Topic`; `ConceptBlock` (markdown); `ExerciseFrame`
cu „Exercițiu i / n" și cardul; footer cu streak + „Skip topic" (confirm).

---

## 14. Faze (milestones) și criterii de acceptare

Fiecare fază se termină cu: `npm run check` verde, `PLAN.md` actualizat, commit, raport,
**stop**.

### Faza 0 — Fundație
**Livrabil:** repo funcțional local, login GitHub merge, schema în D1 local, CI verde pe PR.
1. `npm create svelte@latest` (skeleton, TS strict), adapter-cloudflare, Tailwind 4,
   ESLint flat, Prettier, Vitest, Playwright cu cele două proiecte mobile.
2. `wrangler.toml`: name `devopsdojo`, `main` din adapter, binding D1 `DB`
   (`devopsdojo-db`), `compatibility_flags = ["nodejs_compat"]`, `[assets]`.
   `database_id` placeholder — userul îl completează după `wrangler d1 create`.
3. Drizzle: `schema.ts` complet (§6 + Better Auth), `drizzle.config.ts` (dialect sqlite,
   driver d1-http pentru generate), prima migrație în `drizzle/`.
4. Better Auth: `src/lib/server/auth/better-auth.ts` (GitHub + Google, drizzleAdapter),
   `hooks.server.ts` (session → `event.locals.user`), `routes/api/auth/[...all]`,
   `allowlist.ts` ca `databaseHooks.user.create.before` (respinge dacă `ALLOWED_EMAILS`
   e setat și emailul nu e în listă). Pagina `/login` cu două butoane.
5. `guards.ts`: `requireUser(event)` folosit în toate rutele protejate.
6. CSP: `kit.csp.mode = 'auto'` cu directive stricte; verifici că hidratarea merge.
7. PWA: manifest (nume, iconițe placeholder, `display: standalone`, tema dark), SW minimal.
8. `src/lib/srs/` complet cu FSRS + teste unitare (inclusiv proprietăți: Again resetează,
   Good crește intervalul, idempotență pe același input).
9. `src/lib/cards/schemas.ts` complet + teste pe fiecare refinement.
10. `.dev.vars.example` cu toate variabilele din §15.
11. `.github/workflows/ci.yml` și `deploy.yml` (deploy.yml poate fi commitat dar userul
    activează secrets după).
12. `LICENSE`, `README` (schelet cu secțiunile din §3), `CONTRIBUTING.md`,
    `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md`, `PLAN.md`, ADR 001-008,
    `docs/PROMPT-v2.1.md` (acest fișier), `docs/architecture.md` (v2.0 al userului cu
    nota de delta).
13. `seed-dev.ts`: 1 deck (`linux`), 2 topic-uri, 20 carduri fictive, în D1 local.

**Acceptare:** `npm run dev` → login GitHub → dashboard gol cu streak 0. `npm run check`
verde. CI verde pe un PR de test.

### Faza 1 — Cele trei moduri (cu date fictive)
**Livrabil:** MVP utilizabil pe telefon cu conținutul seed.
1. Dashboard complet (§13).
2. Placement adaptiv complet (§10) + ecran rezultat + override.
3. Cursuri: listă deck-uri, listă topic-uri cu status, lecție (concept → exerciții →
   recap), deblocare secvențială, skip.
4. Review mode cu selector (§9) și cele 7 tipuri de card.
5. Interview mode complet (§11).
6. Streak service + `StreakBadge`. Test: activitate la 23:59 și 00:01 în
   `Europe/Bucharest` = 2 zile.
7. Profil: limbă UI, limbă conținut, temă, retest nivel, interleaving weights.
8. Toate endpoint-urile cu Zod pe input, rate limit simplu (per user, în memorie per
   isolate + header `Retry-After`).
9. E2E: login → placement → lecție → review → streak, pe ambele viewport-uri.
10. `EXPLAIN QUERY PLAN` pe selecție; niciun full scan pe `cards`/`reviews`.

**Acceptare:** userul instalează PWA pe iPhone, face placement, termină un topic, face
un review, vede streak 1. Bundle inițial gzip < 100 KB (raportezi cifra).

### Faza 2 — Pipeline de conținut
**Livrabil:** `content/` e sursa adevărului, sync merge local și în CI.
1. `whisper-normalize.ts`, `cert-curricula.ts`, `reddit.ts` (§12.1).
2. `content:validate`, `content:sync`, `content:stats`, `translate-check`.
3. `CONTENT-GUIDE.md` cu exemple bune/rele per tip de card.
4. Primele **150 carduri reale**: `00-devops-fundamentals` complet (mic) + `01-linux`
   primele 3 topic-uri, EN, din notes + syllabus LPIC. Placement pool minim pentru
   aceste două deck-uri.
5. `deploy.yml` rulează sync în ordinea corectă. Userul face primul deploy real.

**Acceptare:** app live pe `devopsdojo.valegboth.win`, conținut real pe telefon, sync
rulat de două ori = no-op.

### Faza 3 — Curriculum: Fundamentals + Linux + Git
Target: Linux 250+, Git 150+ carduri, EN. Placement pool complet per deck. Fiecare topic
la definition of done. Apoi traducere RO pentru `00` și `01`.

### Faza 4 — Curriculum: App Packages + Docker + Kubernetes
Target: App Packages 60+, Docker 200+, Kubernetes 300+ (CKAD prioritar, CKA după).
Tag-uri `ckad`/`cka`. RO pentru Docker și K8s la final.

### Faza 5 — Curriculum: Jenkins + Ansible + Terraform/AWS
Target: 80-100 fiecare, EN. RO după.

### Faza 6 — Interview pool + Expert tier
Carduri `interview` din notes/reddit: minim 30 per deck principal. Expert tier: 5
sub-module × 30-50 carduri, `is_expert=1`, opționale în Cursuri (nu intră în placement).

### Faza 7 — Polish
Testare pe device real (userul raportează), audit accesibilitate contrast/tap targets,
Sentry (`@sentry/sveltekit`, free tier) opțional, recap săptămânal în Profil din
`review_log`, calibrare FSRS pe datele reale (`ts-fsrs` optimizer dacă există date).
**Punct natural de oprire.**

### Faza 8 — Sandbox real (opțional)
`K3sProvider` peste Cloudflare Tunnel + Access service token către k3s în VM pe
ThinkCentre. Namespace per sesiune, TTL 30 min, runner cu RBAC minim. Design în ADR
înainte de cod.

### Faza 9 — Open launch
README final cu screenshots, fork-to-deploy documentat, `ALLOWED_EMAILS` gol (sau
menținut închis, decizia userului).

---

## 15. Env, secrets, comenzi

**`.dev.vars` (local) / `wrangler secret put` (prod):**

| Var | Obligatoriu | Scop |
|-----|-------------|------|
| `BETTER_AUTH_SECRET` | ✅ | semnare sesiuni (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | ✅ | `http://localhost:5173` local, `https://devopsdojo.valegboth.win` prod |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ✅ | OAuth GitHub |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | opțional | OAuth Google |
| `ALLOWED_EMAILS` | opțional | CSV; gol = public |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | opțional | doar pentru `scripts/sources/reddit.ts` |

**GitHub repo secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**npm scripts:**

| Script | Face |
|--------|------|
| `dev` | `vite dev` (SvelteKit cu platform emulat prin adapter) |
| `dev:wrangler` | `npm run build && wrangler dev` (test real pe Workers runtime) |
| `lint` / `typecheck` / `test` / `test:e2e` / `build` | evidente |
| `check` | `lint && typecheck && test && build && content:validate` |
| `db:generate` | `drizzle-kit generate` |
| `db:migrate:local` / `db:migrate:remote` | `wrangler d1 migrations apply devopsdojo-db --local|--remote` |
| `content:validate` / `content:sync` / `content:stats` / `content:translate-check` | §12 |
| `seed:dev` | `tsx scripts/seed-dev.ts` (doar local) |
| `deploy` | `wrangler deploy` — **doar CI îl rulează** |

**Ce face userul manual (îi reamintești la Faza 0, cu comenzile exacte):**
1. `gh repo create valeboth/devopsdojo --public` (sau din UI).
2. `npx wrangler d1 create devopsdojo-db` → `database_id` în `wrangler.toml`.
3. GitHub OAuth App: callback `http://localhost:5173/api/auth/callback/github` (dev) și
   `https://devopsdojo.valegboth.win/api/auth/callback/github` (prod). La fel Google.
4. `wrangler secret put` pentru fiecare var din tabel.
5. Repo secrets `CLOUDFLARE_API_TOKEN` (permisiuni: Workers Scripts Edit, D1 Edit,
   Account Settings Read) + `CLOUDFLARE_ACCOUNT_ID`.
6. Custom domain `devopsdojo.valegboth.win` pe Worker din dashboard Cloudflare.
7. Copiază transcrierile în `content/sources/transcripts/`.

---

## 16. Standarde de cod și bugete

- TS strict, `noUncheckedIndexedAccess`, zero `any`, ESM only.
- Prettier: 100 col, 2 spații, single quotes, trailing commas `all`.
- Unit coverage ≥ 80% pe `lib/srs`, `lib/cards`, `server/placement`,
  `server/interleaving`, `server/streak`, `scripts/content/sync`.
- Bundle inițial gzip < 100 KB. TTI < 2 s pe 4G simulat. API p50 < 100 ms local.
- HTTPS only, CSP strict, Zod pe fiecare input, rate limit, `SameSite=Lax` pe cookie.
- Fiecare endpoint răspunde `{ ok: true, data }` sau `{ ok: false, error: { code, message } }`.
- Loguri structurate JSON pe `console.error` cu `{ route, user_id?, code, msg }`.

---

## 17. Cum începi (prima acțiune după ce ai citit tot)

1. Confirmi userului în 5-10 rânduri că ai înțeles: stack, cele 20 de decizii, fazele.
   Menționezi orice inconsistență pe care o vezi în acest prompt.
2. Îi dai lista de acțiuni manuale din §15 pe care le poate face în paralel.
3. Începi **Faza 0**, pasul 1. Nu sari peste pași. Nu începi Faza 1.
4. La final Faza 0: `npm run check`, `PLAN.md`, commit, raport, stop.
