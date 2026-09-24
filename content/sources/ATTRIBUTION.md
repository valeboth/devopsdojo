# Sources and attribution

Every source used to write a card is listed here with its terms, and every card
carries a `source` field pointing back to one of these. Cards tagged `interview`
additionally require a `source_url` — enforced by the schema, not by convention.

The rule this file exists to enforce: **we extract facts, never sentences.**
Concepts, commands, flags, common mistakes. Not phrasing, not explanations, not
examples copied across.

See [ADR 008](../../docs/adr/008-apache-20-license.md) for why the code license
does not extend to content.

## Source types

| `source` prefix           | Meaning                                                       | Terms                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cert:<name>:<objective>` | A published certification objective, e.g. `cert:LPIC-1:104.5` | Exam objectives are published by the certifying body for study purposes. We reference objective numbers as a coverage map; we do not reproduce exam questions. |
| `docs:<project>`          | Official project documentation                                | Cited per card with `source_url`. No bulk scraping.                                                                                                            |
| `reddit:<id>`             | A question asked on Reddit, via the official API              | Only the title, URL and a paraphrased summary of the question reach `notes/`. No verbatim user text.                                                           |
| `whisper:<lesson>`        | The author's own transcript of a course they bought           | **Facts only, paraphrased.** Raw transcripts stay in the gitignored `transcripts/` directory and never enter the repository.                                   |
| `own`                     | Written from the author's own experience                      | —                                                                                                                                                              |
| `seed:dev`                | Placeholder rows created by `npm run seed:dev`                | Local development only; never synced to production.                                                                                                            |

## Certification syllabi

| Certification | Body | Objectives used |
| ------------- | ---- | --------------- |
| _(none yet)_  |      |                 |

## Documentation

| Project      | URL | License |
| ------------ | --- | ------- |
| _(none yet)_ |     |         |

## Excluded sources

Deliberately not used, and not to be added without revisiting this file:

- **Glassdoor** — terms prohibit scraping; interview content there is
  user-submitted under their terms, not ours to redistribute.
- **Paid course platforms** (KodeKloud and similar) — no scraping, no verbatim
  quoting, including from courses the author has paid for.
- **YouTube** — only where the author supplies the transcript themselves, and then
  under the same facts-only rule as `whisper:`.
