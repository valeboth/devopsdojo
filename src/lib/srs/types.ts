import { Rating, State } from 'ts-fsrs';

export { Rating, State };

/**
 * The persisted FSRS state for one (user, card). Timestamps are unix ms so the
 * value round-trips through D1 integers without a Date detour.
 */
export interface SrsState {
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: number | null;
}

/**
 * The grades the UI can produce. `Easy` exists in FSRS but the v1 card UI has
 * three buttons only (§8), so nothing can emit it — keeping it out of this type
 * makes that a compile-time guarantee instead of a comment.
 */
export type UiGrade = Rating.Again | Rating.Hard | Rating.Good;

export const UI_GRADES: readonly UiGrade[] = [Rating.Again, Rating.Hard, Rating.Good];

export interface ReviewOutcome {
  /** The state to write back to `reviews`. */
  next: SrsState;
  /** The row to append to `review_log`. */
  log: {
    rating: UiGrade;
    correct: boolean;
    reviewedAt: number;
    /** Days until the card is due again, for the "next in N days" hint. */
    intervalDays: number;
  };
}
