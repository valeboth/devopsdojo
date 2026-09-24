# 006 — Content enters D1 through an idempotent sync, not migrations

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 D12, D13, §12

## Context

Content changes constantly — a thousand cards, each one editable after review.
Schema changes are rare and forward-only. Putting content into migrations would
mean a migration per typo fix, an append-only history of edits nobody can read,
and no way to correct a card that was already applied.

The source of truth is `content/**/*.json` in the repo, reviewed in PRs. D1 is a
projection of it.

## Decision

`drizzle/` holds schema migrations only, applied by `wrangler d1 migrations apply`.
Content is upserted by `npm run content:sync`, which is idempotent and safe to run
on every deploy.

- **Ids are stable slugs** (`linux.permissions.chmod-basics-01`), not generated.
  That is what makes the upsert idempotent and the PR diff readable. ULIDs are
  used only where rows are created at runtime: users, study sessions, review log.
- `cards.content_hash` holds a hash of the source JSON, so sync emits SQL only for
  rows that actually changed. A no-op deploy writes nothing — which matters against
  D1's free-tier write budget.
- **Sync never deletes.** A card removed from `content/` is marked
  `archived = true`. Users' FSRS state references it, and `review_log` keeps its
  history regardless.
- `content:validate` runs in CI on every PR and in the deploy job before the
  migration, so a malformed card cannot reach D1.
- Deck-level rules (placement cards covering difficulty 1-5, a published deck
  having at least 15 of them) live in `scripts/content/validate.ts` rather than in
  Zod, because Zod only ever sees one file at a time.

## Consequences

- A content PR touches no schema and needs no migration — so content review and
  schema review are separate activities with different reviewers' attention.
- Reverting a bad card is a revert of the JSON plus a redeploy, not a corrective
  migration.
- Sync must be ordered: decks, then topics, then cards, then i18n and tags, since
  the foreign keys point upward.
- Archived cards accumulate. A card the author renamed rather than deleted appears
  twice — once archived, once live — so renaming an id is a content operation to
  avoid, and the CONTENT-GUIDE has to say so.
