## What and why

<!-- What changes, and what problem it solves. Link the issue if there is one. -->

## Checks

- [ ] `npm run check` passes locally
- [ ] Tested at 375px width (the app is phone-first, §13)
- [ ] No secrets, `.dev.vars`, or raw course transcripts in the diff

## If this touches the schema

- [ ] A new migration in `drizzle/`, generated with `npm run db:generate`
- [ ] Forward-only: no edits to a migration that has already been applied

## If this touches content

- [ ] `npm run content:validate` passes
- [ ] Each card has a `source`; `interview` cards have a `source_url`
- [ ] Nothing quoted verbatim from paid material
