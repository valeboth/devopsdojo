# 004 — Separate i18n tables, English canonical

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 D9, §7, §12.4

## Context

The user studies in Romanian; the certifications, the documentation and the
interviews are in English. Both languages are needed, but not equally: an
English-only card is still useful, a Romanian-only card is a dead end for the
exam it is meant to prepare.

Two shapes were possible: language columns on the content tables
(`prompt_en`, `prompt_ro`), or separate `*_i18n` tables keyed by `(id, lang)`.

## Decision

Separate `deck_i18n`, `topic_i18n`, `card_i18n` tables keyed by `(id, lang)`, with
English canonical and Romanian optional.

- English is mandatory in every content file and validated against the per-type
  card schema. Romanian is a partial: any field may be absent.
- Reads fall back to English per field, at query time.
- The user has two independent preferences — `ui_lang` and `content_lang` — because
  wanting the interface in Romanian does not mean wanting the exam terminology
  translated.
- **The ids inside a Romanian payload must match the English one**, checked by
  `payloadIdMismatch` in both `content:validate` and `content:translate-check`.
  The answer (`correct_option_id`, `correct_order`, `pairs`) is stored once, not
  per language; if the Romanian translation renumbers its options, a learner
  reading Romanian is graded against the wrong option. This is the one translation
  error that fails the build — a missing translation never does.

## Consequences

- Adding a third language is a migration-free change: new rows, no new columns.
- Every content read joins, and has to handle the missing-row case. That is
  centralised in `src/lib/server/content/queries.ts` so the fallback rule exists
  once.
- Translation can be a batch job over `content/` that never blocks authoring:
  `npm run content:translate-check` reports what is missing and exits 0.
- A half-translated card — Romanian prompt over English options — is worse than an
  untranslated one, so `translate-check` reports a translated prompt with an
  untranslated payload as a gap even though nothing is technically absent.
