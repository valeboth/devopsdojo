# Security policy

## Reporting a vulnerability

**Do not open a public issue.** Report privately through GitHub:

**<https://github.com/valeboth/devopsdojo/security/advisories/new>**

Include what you did, what happened, and what you expected. A proof of concept —
a request, a URL, a short script — is worth more than a description of the class
of bug. If it involves another account's data, please do not touch data that is
not yours: describing how you _could_ is enough.

This is a side project maintained by one person. Expect a first reply within a
week. There is no bounty, and no obligation on your side to wait for a fix before
disclosing — but if you tell me when you plan to publish, I will try to have a fix
out before then.

## Supported versions

Only what is deployed at `https://devopsdojo.valegboth.win` and the current `main`
branch. There are no maintained release branches.

## What is in scope

The deployed Worker and anything in this repository:

- Authentication and session handling (Better Auth, OAuth with GitHub and Google).
- Authorization — anything that lets one user read or change another user's
  progress, reviews, levels or streak.
- The API routes under `/api/`, including the grading endpoint: a way to record
  reviews for cards you were never shown, or to submit a grade the UI cannot
  produce, is a bug.
- Injection of any kind — SQL into D1, HTML/JS into a card's Markdown, anything
  that escapes the sandbox scenario renderer.
- Secrets leaking to the client. Nothing in `.dev.vars` or `wrangler secret` should
  ever be reachable from the browser; the client talks only to the Worker.
- The CI/CD workflows, if a pull request from a fork can make them run with
  repository secrets or deploy.

## What is out of scope

- Missing security headers with no demonstrated impact, and reports that consist
  only of an automated scanner's output.
- Rate limiting and denial of service. Cloudflare's free tier is what it is, and
  the limits are a deliberate trade-off, not an oversight.
- Anything requiring a compromised device, a malicious browser extension, or
  physical access to an unlocked phone.
- Self-XSS, clickjacking on pages with no state-changing action, and missing
  `SameSite`/`Secure` flags on cookies that carry nothing.
- A wrong answer on a card. That is a
  [content issue](https://github.com/valeboth/devopsdojo/issues/new?template=content_issue.yml),
  not a vulnerability.
- Vulnerabilities in Cloudflare Workers, D1, GitHub or Google themselves — report
  those to them.

## Things worth knowing before you test

- The whole app is one Cloudflare Worker: it serves SSR and static assets on one
  origin, so there is no CORS boundary to probe between frontend and API.
- There are no passwords. Auth is OAuth-only, sessions live in D1, and signup can
  be restricted by an email allowlist.
- No secret is ever sent to the client, and none is set by CI. Runtime secrets are
  written once with `wrangler secret put`.
- Please test against a local instance (`npm run dev`) where you can. If you must
  use production, use your own account and keep it to a few requests.
