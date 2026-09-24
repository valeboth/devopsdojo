import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRSParameters,
} from 'ts-fsrs';
import type { ReviewOutcome, SrsState, UiGrade } from './types';

/**
 * FSRS parameters (D6). Defaults are used everywhere except fuzz, which is
 * disabled: the scheduler must be deterministic so that the same review at the
 * same instant always produces the same due date, which is what makes replaying
 * review_log and testing possible.
 */
export const PARAMETERS: FSRSParameters = generatorParameters({
  enable_fuzz: false,
  request_retention: 0.9,
  maximum_interval: 365 * 5,
});

const scheduler = fsrs(PARAMETERS);

const MS_PER_DAY = 86_400_000;

/** The state a card starts in the first time a user sees it. */
export function initialState(now: number): SrsState {
  return fromFsrsCard(createEmptyCard(new Date(now)));
}

export function toFsrsCard(state: SrsState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.lastReview === null ? undefined : new Date(state.lastReview),
  };
}

export function fromFsrsCard(card: FsrsCard): SrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

/**
 * Schedules one review. Pure: same inputs always give the same outputs, so the
 * caller decides when "now" is and what to persist.
 */
export function review(state: SrsState, grade: UiGrade, now: number): ReviewOutcome {
  const result = scheduler.next(toFsrsCard(state), new Date(now), grade);
  const next = fromFsrsCard(result.card);
  return {
    next,
    log: {
      rating: grade,
      // Anything the learner could not recall counts as incorrect; Hard means
      // recalled with effort, which is still a success.
      correct: grade !== Rating.Again,
      reviewedAt: now,
      intervalDays: Math.max(0, (next.due - now) / MS_PER_DAY),
    },
  };
}

/** Preview of the interval each button would produce, for the card footer. */
export function previewIntervals(state: SrsState, now: number): Record<UiGrade, number> {
  const preview = scheduler.repeat(toFsrsCard(state), new Date(now));
  return {
    [Rating.Again]: intervalOf(preview[Rating.Again].card, now),
    [Rating.Hard]: intervalOf(preview[Rating.Hard].card, now),
    [Rating.Good]: intervalOf(preview[Rating.Good].card, now),
  };
}

function intervalOf(card: FsrsCard, now: number): number {
  return Math.max(0, (card.due.getTime() - now) / MS_PER_DAY);
}

export function isDue(state: SrsState, now: number): boolean {
  return state.due <= now;
}

/**
 * Probability that the learner still remembers the card. Used to order the SRS
 * slice of a session: the most fragile cards come first.
 */
export function retrievability(state: SrsState, now: number): number {
  if (state.state === State.New) return 0;
  return scheduler.get_retrievability(toFsrsCard(state), new Date(now), false);
}
