import { Rating } from 'ts-fsrs';
import type { UiGrade } from './types';

/**
 * Maps what happened on a card to an FSRS grade (§8).
 *
 * The UI has three buttons, but for most card types the answer is objectively
 * right or wrong, so the app grades on the learner's behalf: a clean answer is
 * Good, a wrong one is Again, and a correct answer that needed a hint or took
 * too long is Hard. Self-assessment is only offered where correctness is not
 * mechanically checkable.
 */
export interface Attempt {
  correct: boolean;
  /** The learner revealed the explanation before answering. */
  usedHint?: boolean;
  /** Time to answer, if measured. */
  elapsedMs?: number;
  /** Per-card expected time; above this an otherwise correct answer is Hard. */
  slowThresholdMs?: number;
}

export const DEFAULT_SLOW_THRESHOLD_MS = 20_000;

export function gradeAttempt(attempt: Attempt): UiGrade {
  if (!attempt.correct) return Rating.Again;
  if (attempt.usedHint) return Rating.Hard;
  const threshold = attempt.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS;
  if (attempt.elapsedMs !== undefined && attempt.elapsedMs > threshold) return Rating.Hard;
  return Rating.Good;
}

/**
 * Accepts a grade coming from the client. Never trust the number: `Easy` is not
 * reachable from the v1 UI, and `Manual` is not a grade at all.
 */
export function parseUiGrade(value: unknown): UiGrade | null {
  if (value !== Rating.Again && value !== Rating.Hard && value !== Rating.Good) return null;
  return value;
}
