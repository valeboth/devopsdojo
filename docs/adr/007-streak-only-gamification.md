# 007 — Streak is the only gamification

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 §1, D18

## Context

The app borrows Duolingo's lesson loop, and Duolingo's mechanics come as a bundle:
XP, hearts, leagues, gem shops, lesson gating, push notifications. Copying the loop
invites copying the bundle.

Most of that bundle exists to maximise time-in-app for an advertising and
subscription business. This app has one user with a full-time job, and the goal is
passing certifications — where the failure mode is not "stopped opening the app"
but "ground through lessons without retaining anything".

Hearts in particular are actively hostile here: being locked out for getting
answers wrong punishes exactly the cards FSRS most needs to show again.

## Decision

The only mechanic is the streak: `current_streak`, `longest_streak`,
`last_active_date`.

- No XP, no hearts, no leagues, no leaderboard, no gems, no gating of one lesson
  behind another, no push notifications.
- `last_active_date` is a `'YYYY-MM-DD'` string in the **user's** timezone, while
  every other timestamp in the schema is unix milliseconds UTC. A session at 23:59
  and one at 00:01 are different days to the person studying, and that is the only
  place the timezone enters the data model.
- Topic status (`locked` / `available` / `in_progress` / `completed` / `skipped`)
  exists for ordering and progress display, not as a reward gate — a topic can
  always be skipped, with a confirm.

## Consequences

- One table, one service, one badge in the header. The streak logic is worth unit
  testing precisely because it is the only mechanic (the day-boundary cases in
  particular).
- No re-engagement pressure. If the user stops for a week, the app does not chase
  them; the streak resets and the due cards are waiting.
- Motivation rests on the content being worth returning to, which is the right
  place for it to rest and the harder thing to build.
- If this ever needs revisiting, the question to ask is what behaviour the new
  mechanic rewards — not whether it increases engagement.
