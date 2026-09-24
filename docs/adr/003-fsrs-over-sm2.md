# 003 — FSRS instead of SM-2, with an append-only review log

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 D6, §8

## Context

The scheduler decides what the app is worth: a bad interval either wastes a
session on cards already known or lets a card lapse before it is shown again.
SM-2 is simpler to implement but tunes a single ease factor per card, which
overreacts to a single bad answer and cannot express "well known but fragile".

FSRS models stability and difficulty separately and is what Anki's own scheduler
moved to. `ts-fsrs` implements it in TypeScript with no native dependency, so it
runs in a Worker.

## Decision

FSRS through `ts-fsrs`, with `src/lib/srs/` kept pure — no I/O, no database, no
clock of its own (`now` is always a parameter).

- **Fuzz is disabled** (`enable_fuzz: false`). FSRS normally randomises intervals
  slightly to spread load; that makes the scheduler untestable. The same state
  and the same grade must always produce the same interval.
- `request_retention: 0.9`, `maximum_interval: 5 years`.
- **Three buttons, not four.** `Again` / `Hard` / `Good`. `Easy` is excluded at
  the type level (`UiGrade = Rating.Again | Rating.Hard | Rating.Good`), not just
  hidden in the UI, so no code path can produce it. A fourth button on a phone is
  a mis-tap, and "Easy" on a card you got right is a claim most people make wrongly.
- Auto-graded cards map: wrong → `Again`, right but slow or hinted → `Hard`,
  right → `Good`. Swipe cards ask directly.
- `review_log` is **append-only and has no foreign key on `card_id`**: the log
  outlives content edits, and a card that gets archived must not take the history
  of how it was answered with it.
- `reviews` stores `learning_steps` alongside the FSRS fields, because ts-fsrs 5.x
  tracks the position within the learning/relearning steps and a card restored
  without it restarts its steps.
- `interview` and `placement` modes write `review_log` but never touch `reviews`:
  answering under a timer, or being probed at a difficulty you have not studied,
  is not evidence about your retention of that card.

## Consequences

- The scheduler is unit-testable to the interval, and it is (21 tests in
  `tests/unit/srs.test.ts` cover determinism, ordering, lapses and clamping).
- Review load is slightly lumpier without fuzz. At one user with a few hundred
  cards this is invisible; if it ever matters, fuzz can be enabled with a seed
  rather than a random source.
- `review_log` grows without bound by design. It is the input for any future
  recalibration of the FSRS parameters, so it must not be pruned casually.
- Changing FSRS parameters later re-dates every future interval but not the
  stored state, so it is safe — the ADR to write then is about whether to replay
  `review_log` to recompute stability.
