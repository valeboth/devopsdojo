# 002 — OAuth only, no passwords

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 D3, D4, D5

## Context

Passwords need a slow hash — that is the entire point of one. Workers on the free
plan allow ~10 ms of CPU per request, and a correctly configured scrypt or bcrypt
costs an order of magnitude more than that. A hash cheap enough to fit the budget
would be a hash not worth having.

Separately: this is a single-user app for now, with a possibility of a handful of
other people later. A password database is a liability with no upside at that
scale.

## Decision

Better Auth with GitHub and Google as the only providers. `emailAndPassword` is
explicitly disabled rather than left at its default.

- Sessions live in D1, not KV. KV on the free plan allows 1,000 writes/day and is
  eventually consistent — a session write that has not propagated reads as a
  logged-out user.
- Signup is gated by `ALLOWED_EMAILS` (CSV; an `@domain.com` entry allows a whole
  domain). Empty means signups are open. The gate is `databaseHooks.user.create.before`
  returning `false`, so it applies to account creation only — existing users keep
  working if the list later changes.
- Account linking is enabled between GitHub and Google for the same verified
  email, so signing in with the other provider is not a second account.
- No Cloudflare Zero Trust Access in front of the app: authenticating twice on a
  phone is friction, and Access does not know about `user_profile`. Access stays
  reserved for the homelab work in a later phase.

## Consequences

- No password reset flow, no email delivery, no rate limiting on login attempts
  to build — the providers own all of it.
- Sign-in requires network access to GitHub or Google. Offline sign-in is not
  possible, which is fine: the app needs the network for content anyway.
- The `account.password` column exists because Better Auth's schema declares it.
  It is never populated.
- Someone whose email is not on the allowlist gets a signup failure, not a
  sign-in failure — the OAuth dance completes and then the user is rejected. The
  error message has to make that distinction clear.
