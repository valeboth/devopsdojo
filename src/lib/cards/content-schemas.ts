import { z } from 'zod';
import { cardBody } from './schemas';

/**
 * Schemas for the files under `content/` (§7.1, §7.2). They are stricter than
 * the DB: content is reviewed in PRs, so a missing source or tag is caught
 * before it ever reaches D1.
 */

export const LANGS = ['en', 'ro'] as const;
export type Lang = (typeof LANGS)[number];

/** `linux`, `linux.permissions`, `linux.permissions.chmod-basics-01` (D13). */
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const deckId = z.string().regex(slug, 'deck id must be a lowercase slug');
const topicId = z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/, 'topic id must be <deck>.<topic>');
const cardId = z
  .string()
  .regex(/^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/, 'card id must be <deck>.<topic>.<card>');

const tag = z.string().regex(slug).max(32);

// --- deck.json --------------------------------------------------------------

const deckI18nEntry = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});

export const deckFile = z.object({
  id: deckId,
  order: z.number().int().min(0),
  cert_target: z.string().max(200).optional(),
  published: z.boolean().default(false),
  is_expert: z.boolean().default(false),
  // English is canonical and mandatory; Romanian falls back to it (D9).
  i18n: z.object({ en: deckI18nEntry, ro: deckI18nEntry.partial().optional() }).strict(),
});
export type DeckFile = z.infer<typeof deckFile>;

// --- topics/<slug>.json -----------------------------------------------------

const topicI18nEntry = z.object({
  name: z.string().min(1).max(80),
  // §12.4: a concept is read on a phone before the exercises, not a chapter.
  concept_md: z.string().min(1).max(1500),
  recap_md: z.string().max(1500).optional(),
});

const cardI18nEntry = z.object({
  // §12.4: a prompt must fit above the fold on a 375px screen.
  prompt: z.string().min(1).max(200),
  payload: z.unknown(),
  answer: z.unknown(),
});

const cardFileBase = z.object({
  id: cardId,
  type: z.enum(['choice', 'multi', 'order', 'match', 'fill', 'log_tap', 'swipe']),
  difficulty: z.number().int().min(1).max(5),
  // At least one tag: tags are how interview mode and placement find cards.
  tags: z.array(tag).min(1),
  source: z.string().min(1).max(200),
  source_url: z.url().max(500).optional(),
  i18n: z.object({ en: cardI18nEntry, ro: cardI18nEntry.partial().optional() }).strict(),
});

export const cardFile = cardFileBase
  // Interview cards are quoted to a candidate, so they must be traceable to a
  // public source (§7.2).
  .refine((c) => !c.tags.includes('interview') || c.source_url !== undefined, {
    message: 'cards tagged "interview" require source_url',
    path: ['source_url'],
  })
  .refine(
    (c) => {
      // The English body must satisfy the per-type payload/answer contract.
      const parsed = cardBody.safeParse({
        type: c.type,
        payload: c.i18n.en.payload,
        answer: c.i18n.en.answer,
      });
      return parsed.success;
    },
    { message: 'i18n.en payload/answer do not match the card type', path: ['i18n', 'en'] },
  );
export type CardFile = z.infer<typeof cardFile>;

export const MIN_CARDS_PER_PUBLISHED_TOPIC = 5;
export const MIN_PLACEMENT_CARDS_PER_PUBLISHED_DECK = 15;

export const topicFile = z
  .object({
    id: topicId,
    order: z.number().int().min(0),
    parent_id: topicId.optional(),
    published: z.boolean().default(false),
    i18n: z.object({ en: topicI18nEntry, ro: topicI18nEntry.partial().optional() }).strict(),
    cards: z.array(cardFile).min(1),
  })
  .refine((t) => t.cards.every((card) => card.id.startsWith(`${t.id}.`)), {
    message: 'every card id must be prefixed with its topic id',
    path: ['cards'],
  })
  .refine((t) => new Set(t.cards.map((card) => card.id)).size === t.cards.length, {
    message: 'card ids must be unique within a topic',
    path: ['cards'],
  })
  // §12.3/§12.4: a topic is only worth publishing once it can carry a lesson.
  .refine((t) => !t.published || t.cards.length >= MIN_CARDS_PER_PUBLISHED_TOPIC, {
    message: `a published topic needs at least ${MIN_CARDS_PER_PUBLISHED_TOPIC} cards`,
    path: ['cards'],
  })
  .refine((t) => !t.published || t.i18n.en.recap_md !== undefined, {
    message: 'a published topic needs an English recap_md',
    path: ['i18n', 'en', 'recap_md'],
  });
export type TopicFile = z.infer<typeof topicFile>;

/**
 * Cards tagged `placement` must cover difficulty 1..5 within a deck, otherwise
 * the adaptive test cannot move up or down (§7.2). Checked per deck rather than
 * per topic, since that is the level the test operates at.
 */
export function missingPlacementDifficulties(cards: readonly CardFile[]): number[] {
  const present = new Set(
    cards.filter((card) => card.tags.includes('placement')).map((card) => card.difficulty),
  );
  return [1, 2, 3, 4, 5].filter((level) => !present.has(level));
}

export function countPlacementCards(cards: readonly CardFile[]): number {
  return cards.filter((card) => card.tags.includes('placement')).length;
}

/**
 * The ids inside a Romanian payload must match the English one (§12.4):
 * `answer.correct_option_id` is stored once per language, so if RO renumbers its
 * options a learner reading Romanian is graded against the wrong option.
 */
export function payloadIdMismatch(card: CardFile): string | null {
  const ro = card.i18n.ro;
  if (!ro || ro.payload === undefined) return null;
  const en = collectIds(card.i18n.en.payload);
  const translated = collectIds(ro.payload);
  if (en.length !== translated.length || en.some((value, i) => value !== translated[i])) {
    return `ro payload ids [${translated.join(', ')}] do not match en [${en.join(', ')}]`;
  }
  return null;
}

/** Every `id` in a payload, in a stable order, at any nesting depth. */
function collectIds(payload: unknown): string[] {
  const ids: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node !== null && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (typeof record.id === 'string') ids.push(record.id);
      for (const key of Object.keys(record).sort()) {
        if (key !== 'id') visit(record[key]);
      }
    }
  };
  visit(payload);
  return ids.sort();
}
