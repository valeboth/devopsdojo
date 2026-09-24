# Contributing

Thanks for looking. This is a single-maintainer project, so the most useful
contributions are small and specific: a card with a wrong answer, a broken
explanation, a missing Romanian translation, a layout bug on a narrow phone.

Two things to know before anything else:

- **The code is Apache 2.0. The content is not.** See
  [Attribution](#attribution-and-content-ethics) below — it is not a formality,
  it decides whether a card can be merged at all.
- **Nothing verbatim from paid material**, including courses you paid for.

## Getting set up

Node 24+ and npm. The full setup is in the [README](README.md#local-setup);
the short version:

```sh
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 create devopsdojo-db   # paste the database_id into wrangler.toml
npm run db:migrate:local
npm run seed:dev
npm run dev
```

## Before you push

```sh
npm run check
```

That is lint, typecheck, unit + integration tests, a production build, and
`content:validate`. CI runs exactly this plus Playwright, so a green `check`
locally means the only thing left to surprise you is the E2E suite.

If you touched the UI, also look at it at 375px wide. Not "it probably reflows" —
open it. Most of this app is used one-handed on a phone.

## Commit messages

```
<type>(<scope>): <what changed, imperative, lowercase>
```

| Type       | For                                           |
| ---------- | --------------------------------------------- |
| `feat`     | New behaviour a user can see                  |
| `fix`      | A bug                                         |
| `content`  | Cards, topics, decks, scenarios, translations |
| `refactor` | Same behaviour, different code                |
| `test`     | Tests only                                    |
| `docs`     | Documentation, ADRs                           |
| `chore`    | Dependencies, config, CI                      |

Scope is the area: a deck slug for content (`content(linux): …`), otherwise the
module (`feat(srs):`, `fix(lesson):`). Examples:

```
feat(placement): stop the test early once the level is stable
fix(lesson): keep the grade buttons above the safe-area inset
content(linux): add permissions topic (9 cards)
content(linux): ro translation for permissions
```

One logical change per commit. Keep translations in their own commit from the
cards they translate — it makes `content:translate-check` output reviewable.

## Pull requests

Fill in the template. The checks in it are the ones that actually catch things:
`npm run check`, tested at 375px, no secrets or transcripts in the diff.

If the PR changes `src/lib/server/db/schema.ts`, it must include the generated
migration (`npm run db:generate`) and that migration must be forward-only — no
editing a migration that has already been applied to production, ever. If you
need a column gone, add a migration that drops it.

## Contributing content

Read [`content/CONTENT-GUIDE.md`](content/CONTENT-GUIDE.md) first. It covers what
the validator cannot: what makes a distractor plausible, why an explanation has
to say _why_, and which card type fits which skill.

The mechanics:

1. Add or edit JSON under `content/decks/<nn>-<slug>/`.
2. `npm run content:validate` — Zod plus the deck-level rules.
3. `npm run content:stats` to see coverage, `npm run content:translate-check` for
   Romanian gaps.
4. Every card needs a `source`. Cards tagged `interview` also need a
   `source_url`, and the schema enforces it.

**Ids are permanent.** `linux.permissions.chmod-basics-01` is the join key into
D1. Renaming it creates a new card and archives the old one, which orphans
everyone's review history for it. Fix the text, keep the id.

English is canonical; Romanian is optional per field and falls back to English.
Translate the prose and leave commands, flags and output alone — `kubectl get
pods` is not Romanian or English, it is what you type.

## Reporting things

- **A wrong or ambiguous card** → the _Content issue_ template. Include the card
  id (it is shown in the UI) and say what the right answer is and why.
- **A bug** → the _Bug report_ template. Device and browser are required, because
  almost every layout bug here is one or the other.
- **A security issue** → do not open an issue. See [SECURITY.md](SECURITY.md).

## Attribution and content ethics

The repository is public. `content/sources/transcripts/` is gitignored and never
committed.

Cards are written from published certification objectives, official project
documentation, questions asked publicly on Reddit via its official API, and the
author's own paraphrased notes. Facts, not sentences: a concept, a command, a flag,
a mistake people make. Not phrasing, not explanations copied across, not examples.

Every source and its terms go in
[`content/sources/ATTRIBUTION.md`](content/sources/ATTRIBUTION.md) before the
source is used, not after. Glassdoor, paid course platforms and YouTube are on the
excluded list there; adding a source means revisiting that file.

The reasoning behind the license split is in
[ADR 008](docs/adr/008-apache-20-license.md). By contributing code you agree it is
licensed under Apache 2.0.

## Decisions

Architectural decisions live in [`docs/adr/`](docs/adr/) — why there is no
separate API framework, why auth is OAuth-only, why FSRS and not SM-2, and so on.
If a PR argues against one of those, that is a fine thing to do: it should add an
ADR that supersedes it rather than quietly working around it.
