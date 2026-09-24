import { z } from 'zod';

/**
 * Card payload/answer schemas (§7.3). These are the single source of truth: the
 * content pipeline validates JSON files against them, the API validates what the
 * client submits, and the UI derives its types from them.
 *
 * The refinements matter as much as the shapes — an unanswerable card that
 * passes validation reaches a learner, and fixing it after the fact means
 * touching their FSRS state.
 */

export const CARD_TYPES = [
  'choice',
  'multi',
  'order',
  'match',
  'fill',
  'log_tap',
  'swipe',
] as const;
export type CardType = (typeof CARD_TYPES)[number];

const id = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are lowercase kebab-case');

const text = z.string().min(1).max(80); // §12.4: an option must fit on a phone
const explanation = z.string().min(20).max(1200); // §12.4: must actually explain

/** Free text with ids, used to check that every id in a set is distinct. */
function uniqueIds<T extends { id: string }>(items: readonly T[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

/**
 * Two options that read the same after trimming and lowercasing make the card
 * unanswerable even though their ids differ (§12.4).
 */
function uniqueTexts<T extends { text: string }>(items: readonly T[]): boolean {
  return new Set(items.map((item) => item.text.trim().toLowerCase())).size === items.length;
}

/**
 * An explanation that just repeats the correct option teaches nothing (§12.4).
 */
function explainsMoreThanTheAnswer(explanation: string, answerText: string | undefined): boolean {
  if (answerText === undefined) return true;
  return explanation.trim().toLowerCase() !== answerText.trim().toLowerCase();
}

const option = z.object({ id, text });

// --- choice -----------------------------------------------------------------

export const choicePayload = z
  .object({ options: z.array(option).length(4) })
  .refine((p) => uniqueIds(p.options), { message: 'option ids must be unique' })
  .refine((p) => uniqueTexts(p.options), { message: 'option texts must be distinct' });

export const choiceAnswer = z.object({
  correct_option_id: id,
  explanation,
});

const choiceCard = z
  .object({ type: z.literal('choice'), payload: choicePayload, answer: choiceAnswer })
  .refine((c) => c.payload.options.some((o) => o.id === c.answer.correct_option_id), {
    message: 'correct_option_id must reference one of the options',
    path: ['answer', 'correct_option_id'],
  })
  .refine(
    (c) =>
      explainsMoreThanTheAnswer(
        c.answer.explanation,
        c.payload.options.find((o) => o.id === c.answer.correct_option_id)?.text,
      ),
    {
      message: 'explanation must say more than the correct option text',
      path: ['answer', 'explanation'],
    },
  );

// --- multi ------------------------------------------------------------------

export const multiPayload = z
  .object({ options: z.array(option).min(4).max(6) })
  .refine((p) => uniqueIds(p.options), { message: 'option ids must be unique' })
  .refine((p) => uniqueTexts(p.options), { message: 'option texts must be distinct' });

export const multiAnswer = z.object({
  correct_option_ids: z
    .array(id)
    .min(2)
    .max(4)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'correct_option_ids must not repeat',
    }),
  explanation,
});

const multiCard = z
  .object({ type: z.literal('multi'), payload: multiPayload, answer: multiAnswer })
  .refine(
    (c) => {
      const available = new Set(c.payload.options.map((o) => o.id));
      return c.answer.correct_option_ids.every((optionId) => available.has(optionId));
    },
    {
      message: 'every correct_option_id must reference one of the options',
      path: ['answer', 'correct_option_ids'],
    },
  )
  // All options correct means there is nothing to discriminate.
  .refine((c) => c.answer.correct_option_ids.length < c.payload.options.length, {
    message: 'at least one option must be incorrect',
    path: ['answer', 'correct_option_ids'],
  });

// --- order ------------------------------------------------------------------

export const orderPayload = z
  .object({ items: z.array(option).min(3).max(7) })
  .refine((p) => uniqueIds(p.items), { message: 'item ids must be unique' })
  .refine((p) => uniqueTexts(p.items), { message: 'item texts must be distinct' });

export const orderAnswer = z.object({
  correct_order: z.array(id).min(3).max(7),
  explanation,
});

const orderCard = z
  .object({ type: z.literal('order'), payload: orderPayload, answer: orderAnswer })
  .refine(
    (c) =>
      c.answer.correct_order.length === c.payload.items.length &&
      new Set(c.answer.correct_order).size === c.answer.correct_order.length,
    {
      message: 'correct_order must list every item exactly once',
      path: ['answer', 'correct_order'],
    },
  )
  .refine(
    (c) => {
      const available = new Set(c.payload.items.map((item) => item.id));
      return c.answer.correct_order.every((itemId) => available.has(itemId));
    },
    {
      message: 'correct_order may only reference payload items',
      path: ['answer', 'correct_order'],
    },
  );

// --- match ------------------------------------------------------------------

export const matchPayload = z
  .object({
    left: z.array(option).min(3).max(5),
    right: z.array(option).min(3).max(5),
  })
  .refine((p) => uniqueIds(p.left) && uniqueIds(p.right), {
    message: 'left and right ids must each be unique',
  })
  .refine((p) => uniqueTexts(p.left) && uniqueTexts(p.right), {
    message: 'left and right texts must each be distinct',
  });

export const matchAnswer = z.object({
  pairs: z
    .array(z.object({ left_id: id, right_id: id }))
    .min(3)
    .max(5),
  explanation,
});

const matchCard = z
  .object({ type: z.literal('match'), payload: matchPayload, answer: matchAnswer })
  .refine((c) => c.answer.pairs.length === c.payload.left.length, {
    message: 'every left item must be paired',
    path: ['answer', 'pairs'],
  })
  .refine(
    (c) => {
      const left = new Set(c.payload.left.map((item) => item.id));
      const right = new Set(c.payload.right.map((item) => item.id));
      return c.answer.pairs.every((pair) => left.has(pair.left_id) && right.has(pair.right_id));
    },
    { message: 'pairs must reference existing left and right ids', path: ['answer', 'pairs'] },
  )
  .refine(
    (c) =>
      new Set(c.answer.pairs.map((p) => p.left_id)).size === c.answer.pairs.length &&
      new Set(c.answer.pairs.map((p) => p.right_id)).size === c.answer.pairs.length,
    {
      // A right item used twice makes the card ambiguous to grade.
      message: 'each left and right id may appear in at most one pair',
      path: ['answer', 'pairs'],
    },
  );

// --- fill -------------------------------------------------------------------

/** Typing on a phone is expensive, so accepted answers stay short (§7.3). */
export const FILL_MAX_LENGTH = 30;

export const fillPayload = z.object({
  before: z.string().min(1).max(400),
  after: z.string().max(400).optional(),
  hint: z.string().max(160).optional(),
});

export const fillAnswer = z.object({
  correct: z
    .array(z.string().min(1).max(FILL_MAX_LENGTH).trim())
    .min(1)
    .refine((values) => new Set(values).size === values.length, {
      message: 'accepted answers must not repeat',
    }),
  case_sensitive: z.boolean().default(false),
  explanation,
});

const fillCard = z
  .object({ type: z.literal('fill'), payload: fillPayload, answer: fillAnswer })
  // Case-insensitive answers that only differ in case are duplicates.
  .refine(
    (c) =>
      c.answer.case_sensitive ||
      new Set(c.answer.correct.map((v) => v.toLowerCase())).size === c.answer.correct.length,
    {
      message: 'case-insensitive answers must differ by more than case',
      path: ['answer', 'correct'],
    },
  );

// --- log_tap ----------------------------------------------------------------

export const LOG_TAP_MIN_LINES = 8;
export const LOG_TAP_MAX_LINES = 15;

export const logTapPayload = z
  .object({
    log: z.string().min(1).max(4000),
    hint: z.string().max(160).optional(),
  })
  .refine(
    (p) => {
      const lines = logLines(p.log);
      return lines.length >= LOG_TAP_MIN_LINES && lines.length <= LOG_TAP_MAX_LINES;
    },
    { message: `log must have between ${LOG_TAP_MIN_LINES} and ${LOG_TAP_MAX_LINES} lines` },
  );

export const logTapAnswer = z.object({
  target_line_substring: z.string().min(3).max(200),
  explanation,
});

const logTapCard = z
  .object({ type: z.literal('log_tap'), payload: logTapPayload, answer: logTapAnswer })
  .refine(
    (c) =>
      logLines(c.payload.log).filter((line) => line.includes(c.answer.target_line_substring))
        .length === 1,
    {
      // Matching two lines makes the card unanswerable: either tap is defensible.
      message: 'target_line_substring must match exactly one line of the log',
      path: ['answer', 'target_line_substring'],
    },
  );

/** Splits a log into its meaningful lines; trailing newlines are not lines. */
export function logLines(log: string): string[] {
  return log.split('\n').filter((line) => line.trim().length > 0);
}

// --- swipe ------------------------------------------------------------------

export const swipePayload = z.object({
  front: z.string().min(1).max(400),
  back: z.string().min(1).max(1200),
});

// Swipe cards are self-graded, so there is nothing to check an answer against;
// the explanation still has to be there (§7.2).
export const swipeAnswer = z.object({ explanation });

const swipeCard = z.object({
  type: z.literal('swipe'),
  payload: swipePayload,
  answer: swipeAnswer,
});

// --- the union --------------------------------------------------------------

/**
 * Discriminating on `type` before validating the body means an unknown type
 * reports "invalid type" instead of seven parallel shape errors.
 */
export const cardBody = z.discriminatedUnion('type', [
  choiceCard,
  multiCard,
  orderCard,
  matchCard,
  fillCard,
  logTapCard,
  swipeCard,
]);

export type CardBody = z.infer<typeof cardBody>;
export type ChoicePayload = z.infer<typeof choicePayload>;
export type MultiPayload = z.infer<typeof multiPayload>;
export type OrderPayload = z.infer<typeof orderPayload>;
export type MatchPayload = z.infer<typeof matchPayload>;
export type FillPayload = z.infer<typeof fillPayload>;
export type LogTapPayload = z.infer<typeof logTapPayload>;
export type SwipePayload = z.infer<typeof swipePayload>;

export const PAYLOAD_SCHEMAS = {
  choice: choicePayload,
  multi: multiPayload,
  order: orderPayload,
  match: matchPayload,
  fill: fillPayload,
  log_tap: logTapPayload,
  swipe: swipePayload,
} as const satisfies Record<CardType, z.ZodType>;

export const ANSWER_SCHEMAS = {
  choice: choiceAnswer,
  multi: multiAnswer,
  order: orderAnswer,
  match: matchAnswer,
  fill: fillAnswer,
  log_tap: logTapAnswer,
  swipe: swipeAnswer,
} as const satisfies Record<CardType, z.ZodType>;
