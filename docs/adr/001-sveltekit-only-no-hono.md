# 001 — SvelteKit only, no Hono

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 D1, D2

## Context

The v2.0 architecture put Hono in front of the API and SvelteKit in front of the
UI, deployed as two pieces. Both frameworks can route, both can read the request,
and both would need the same session lookup — so every endpoint would exist in
one of two places with no rule for which.

The app is also a phone app first. Anything that adds a second network hop or a
second origin (and therefore CORS, and therefore preflights on a 4G connection)
costs latency where it hurts most.

## Decision

One SvelteKit app, one Cloudflare Worker, one origin.

- HTTP endpoints live in `src/routes/api/**/+server.ts`.
- Anything a page needs goes through `load` and form actions instead of an
  endpoint, so the page works before JavaScript arrives.
- `@sveltejs/adapter-cloudflare` builds the Worker; static assets are served
  from the same Worker via the `[assets]` binding. No Cloudflare Pages.

## Consequences

- No CORS configuration anywhere, and no preflight round-trip on mobile.
- Cloudflare bindings (`platform.env.DB`) are reachable from every server file
  through the same `App.Platform` type.
- Form actions mean login and grading work with JavaScript disabled or still
  loading — which on a phone is the first second of every visit.
- The trade-off: SvelteKit's routing is file-based and less expressive than a
  router library for things like versioned API prefixes. Acceptable — the API is
  private to this app and versioned by deploying it.
- If the API ever needs to be consumed by something that is not this app, this
  decision is the one to revisit.
