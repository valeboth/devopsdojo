# 008 — Apache 2.0 for the code, and what that means for the content

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 §1, §12.6

## Context

The repository is public and holds two different kinds of work: application code,
and study content derived from certification syllabi, official documentation, and
the author's own notes on paid courses. A single license line at the root would
paper over that difference.

The realistic candidates for the code were MIT, Apache 2.0 and AGPL. AGPL would
require anyone hosting a fork to publish their changes, which is a policy this
project has no interest in enforcing. MIT and Apache 2.0 differ mainly in that
Apache 2.0 grants a patent license and requires a change notice.

## Decision

The code is Apache 2.0.

The content is **not** covered by that grant, and this has to be stated
explicitly rather than assumed:

- `content/sources/transcripts/` is gitignored and never committed. Those are
  transcripts of paid courses; the repository is public.
- Only paraphrased facts — concepts, commands, common mistakes — reach
  `content/sources/notes/` and from there the cards. Nothing verbatim from paid
  material, ever.
- Every card carries a `source`; cards tagged `interview` additionally require a
  `source_url`, enforced by the card schema, so an interview question quoted to a
  candidate is always traceable to something public.
- `content/sources/ATTRIBUTION.md` lists each source with its license or terms.

## Consequences

- Contributors get a patent grant and clear terms; a fork must state what it
  changed (Apache 2.0 §4(b)).
- The README and `CONTRIBUTING.md` must both make the code/content split visible,
  because a reader who sees only the root `LICENSE` will assume it covers
  everything in the repository.
- Any new content source has to be assessed before use, not after: the question is
  whether its terms permit extracting facts, and the answer goes in
  `ATTRIBUTION.md`.
- Relicensing the code later would require every contributor's agreement. With one
  contributor that is cheap today and expensive later — which is an argument for
  getting this right now rather than revisiting it.
