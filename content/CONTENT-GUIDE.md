# Writing cards

The schema in `src/lib/cards/schemas.ts` is what `npm run content:validate`
enforces. This file is about the part a validator cannot check: whether a card is
worth answering.

## The shape of a topic

A topic is one sitting on a phone: a short concept, 5-12 exercises, a recap.

- `concept_md` — 1-2 paragraphs, max ~150 words, English. Code in fenced blocks.
  It is read once before the exercises, not a chapter to study.
- 5-12 cards, **at least 3 different types**, difficulty spread rather than all at 3. A topic of nothing but `choice` cards trains recognition, not recall.
- `recap_md` — what to remember after the drill. Required to publish.

A topic is publishable when it has the concept, the recap, at least 5 cards, and
every certification objective mapped to it has at least one card.

## What makes a card good

**The prompt asks one thing.** Max 200 characters, because it has to fit above the
fold on a 375px screen alongside the options.

**The distractors are wrong for a reason.** Four options where three are obviously
absurd is a reading-comprehension test. Good distractors are the mistakes people
actually make: the flag that does the adjacent thing, the command that works but
not here, the answer that was right two versions ago.

**The explanation says why, not what.** `explanation` must be at least 20
characters and must differ from the correct option's text — both enforced — but
the real bar is higher: it should tell the reader something they did not already
learn from being told they were right.

> Bad: "Because 700 is correct."
> Good: "7 = rwx for the owner; the two zeros deny group and other, which is what
> 'only its owner' means."

**One defensible answer.** If a knowledgeable person could argue for a second
option, the card is broken even though it validates. This is the most common real
defect.

**Commands are not translated.** In `i18n.ro`, translate the prose and leave
`chmod`, `kubectl get pods`, flag names and output alone.

## Per type

| Type      | Use it when                                | Watch out for                                                                                                      |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `choice`  | One right answer among four plausible ones | Distractors that are not plausible                                                                                 |
| `multi`   | 2-4 of 4-6 options are correct             | Making every option correct (rejected); "select all that apply" where the count gives it away                      |
| `order`   | A sequence has one correct order           | Steps that are genuinely independent — then there is no single order                                               |
| `match`   | 3-5 pairs, a bijection                     | A right item that fits two left items                                                                              |
| `fill`    | The answer is one short token (≤30 chars)  | Typing on a phone: accept the real variants (`700` and `u+rwx`), set `case_sensitive` only when case truly matters |
| `log_tap` | Reading real output is the skill           | The target substring must match exactly one line (enforced); 8-15 lines, from real output, not invented            |
| `swipe`   | Self-graded recall, no gradable answer     | Using it to avoid writing distractors                                                                              |

## Tags

- `placement` — part of the adaptive level test. A published deck needs at least 15
  of these covering difficulty 1-5. Only `choice`, `fill` and `log_tap`.
- `interview` — asked in real interviews. **Requires `source_url`.**
- Certification tags (`lpic-1`, `ckad`, …) map cards to objectives so `stats.ts`
  can report coverage.

## Ids

`<deck>.<topic>.<card>`, lowercase kebab-case, stable forever:
`linux.permissions.chmod-basics-01`.

Ids are the join key into D1. **Renaming an id creates a new card and archives the
old one**, which means someone's review history now points at an archived card
while they see a fresh one. Fix the content, keep the id.

## Workflow

```sh
npm run content:validate        # Zod + the §12.4 rules; run before every commit
npm run content:stats           # coverage per deck/topic/type/difficulty, ro %
npm run content:translate-check # what Romanian is missing
```

Commit as `content(<deck>): add <topic> (<n> cards)`, translations separately as
`content(<deck>): ro translation for <topic>`.

## Ethics

Facts, not sentences. Nothing verbatim from paid material, including courses the
author bought. Raw transcripts stay out of the repository — it is public. Every
source goes in [`sources/ATTRIBUTION.md`](sources/ATTRIBUTION.md) with its terms.
