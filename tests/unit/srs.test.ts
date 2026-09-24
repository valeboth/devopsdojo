import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import {
  gradeAttempt,
  initialState,
  isDue,
  parseUiGrade,
  previewIntervals,
  retrievability,
  review,
  type SrsState,
} from '$lib/srs';

const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
const DAY = 86_400_000;

/** Walks a card through a sequence of grades, one day apart. */
function sequence(grades: readonly Rating[], start = T0): SrsState {
  let state = initialState(start);
  let now = start;
  for (const grade of grades) {
    now = Math.max(now, state.due);
    state = review(state, grade as Rating.Again | Rating.Hard | Rating.Good, now).next;
  }
  return state;
}

describe('initialState', () => {
  it('starts as a New card due immediately', () => {
    const state = initialState(T0);
    expect(state.state).toBe(State.New);
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.lastReview).toBeNull();
    expect(isDue(state, T0)).toBe(true);
  });
});

describe('review', () => {
  it('is deterministic: fuzz is disabled', () => {
    const state = initialState(T0);
    const a = review(state, Rating.Good, T0);
    const b = review(state, Rating.Good, T0);
    expect(a).toEqual(b);
  });

  it('does not mutate the state it is given', () => {
    const state = initialState(T0);
    const snapshot = structuredClone(state);
    review(state, Rating.Good, T0);
    expect(state).toEqual(snapshot);
  });

  it('counts Again as incorrect and the other grades as correct', () => {
    const state = initialState(T0);
    expect(review(state, Rating.Again, T0).log.correct).toBe(false);
    expect(review(state, Rating.Hard, T0).log.correct).toBe(true);
    expect(review(state, Rating.Good, T0).log.correct).toBe(true);
  });

  it('records the review time and increments reps', () => {
    const { next, log } = review(initialState(T0), Rating.Good, T0);
    expect(log.reviewedAt).toBe(T0);
    expect(next.lastReview).toBe(T0);
    expect(next.reps).toBe(1);
  });

  it('grows the interval when a mature card is answered Good', () => {
    const mature = sequence([Rating.Good, Rating.Good, Rating.Good]);
    expect(mature.state).toBe(State.Review);
    const first = review(mature, Rating.Good, mature.due);
    const later = sequence([Rating.Good, Rating.Good, Rating.Good, Rating.Good]);
    expect(first.next.due - mature.due).toBeGreaterThan(mature.due - (mature.lastReview ?? 0));
    expect(later.scheduledDays).toBeGreaterThan(mature.scheduledDays);
  });

  it('Again on a mature card resets it to relearning, adds a lapse and shortens the interval', () => {
    const mature = sequence([Rating.Good, Rating.Good, Rating.Good]);
    const lapsed = review(mature, Rating.Again, mature.due).next;
    expect(lapsed.state).toBe(State.Relearning);
    expect(lapsed.lapses).toBe(mature.lapses + 1);
    expect(lapsed.due - mature.due).toBeLessThan(mature.scheduledDays * DAY);
    expect(lapsed.stability).toBeLessThan(mature.stability);
  });

  it('Good schedules no sooner than Hard, which schedules no sooner than Again', () => {
    const mature = sequence([Rating.Good, Rating.Good, Rating.Good]);
    const at = mature.due;
    const again = review(mature, Rating.Again, at).next.due;
    const hard = review(mature, Rating.Hard, at).next.due;
    const good = review(mature, Rating.Good, at).next.due;
    expect(again).toBeLessThanOrEqual(hard);
    expect(hard).toBeLessThanOrEqual(good);
  });

  it('keeps difficulty inside the FSRS 1..10 range even after many Again grades', () => {
    const punished = sequence(Array.from({ length: 12 }, () => Rating.Again));
    expect(punished.difficulty).toBeGreaterThanOrEqual(1);
    expect(punished.difficulty).toBeLessThanOrEqual(10);
    expect(punished.stability).toBeGreaterThan(0);
  });

  it('never schedules beyond the configured maximum interval', () => {
    const veteran = sequence(Array.from({ length: 30 }, () => Rating.Good));
    const intervalDays = (veteran.due - (veteran.lastReview ?? 0)) / DAY;
    expect(intervalDays).toBeLessThanOrEqual(365 * 5 + 1);
  });

  it('reports an interval that matches the due date it produced', () => {
    const mature = sequence([Rating.Good, Rating.Good]);
    const { next, log } = review(mature, Rating.Good, mature.due);
    expect(log.intervalDays).toBeCloseTo((next.due - mature.due) / DAY, 6);
  });
});

describe('previewIntervals', () => {
  it('matches what review() actually schedules for each button', () => {
    const mature = sequence([Rating.Good, Rating.Good]);
    const at = mature.due;
    const preview = previewIntervals(mature, at);
    for (const grade of [Rating.Again, Rating.Hard, Rating.Good] as const) {
      expect(preview[grade]).toBeCloseTo(review(mature, grade, at).log.intervalDays, 6);
    }
  });

  it('orders the buttons Again <= Hard <= Good', () => {
    const preview = previewIntervals(sequence([Rating.Good, Rating.Good]), T0 + 30 * DAY);
    expect(preview[Rating.Again]).toBeLessThanOrEqual(preview[Rating.Hard]);
    expect(preview[Rating.Hard]).toBeLessThanOrEqual(preview[Rating.Good]);
  });
});

describe('retrievability', () => {
  it('is 0 for a card never seen', () => {
    expect(retrievability(initialState(T0), T0)).toBe(0);
  });

  it('decays as time passes since the last review', () => {
    const mature = sequence([Rating.Good, Rating.Good, Rating.Good]);
    const soon = retrievability(mature, (mature.lastReview ?? T0) + DAY);
    const later = retrievability(mature, (mature.lastReview ?? T0) + 400 * DAY);
    expect(soon).toBeGreaterThan(later);
    expect(later).toBeGreaterThanOrEqual(0);
    expect(soon).toBeLessThanOrEqual(1);
  });
});

describe('gradeAttempt', () => {
  it('maps a wrong answer to Again regardless of speed or hints', () => {
    expect(gradeAttempt({ correct: false })).toBe(Rating.Again);
    expect(gradeAttempt({ correct: false, elapsedMs: 10 })).toBe(Rating.Again);
    expect(gradeAttempt({ correct: false, usedHint: true })).toBe(Rating.Again);
  });

  it('maps a clean, quick answer to Good', () => {
    expect(gradeAttempt({ correct: true, elapsedMs: 3000 })).toBe(Rating.Good);
    expect(gradeAttempt({ correct: true })).toBe(Rating.Good);
  });

  it('maps a correct answer to Hard when a hint was used or it was slow', () => {
    expect(gradeAttempt({ correct: true, usedHint: true })).toBe(Rating.Hard);
    expect(gradeAttempt({ correct: true, elapsedMs: 60_000 })).toBe(Rating.Hard);
    expect(gradeAttempt({ correct: true, elapsedMs: 900, slowThresholdMs: 500 })).toBe(Rating.Hard);
  });

  it('never returns Easy: the v1 UI has three buttons', () => {
    const grades = [
      gradeAttempt({ correct: true, elapsedMs: 1 }),
      gradeAttempt({ correct: true, usedHint: true }),
      gradeAttempt({ correct: false }),
    ];
    expect(grades).not.toContain(Rating.Easy);
  });
});

describe('parseUiGrade', () => {
  it('accepts the three UI grades', () => {
    expect(parseUiGrade(1)).toBe(Rating.Again);
    expect(parseUiGrade(2)).toBe(Rating.Hard);
    expect(parseUiGrade(3)).toBe(Rating.Good);
  });

  it('rejects Easy, Manual and anything that is not a grade', () => {
    for (const bad of [0, 4, -1, 3.5, '3', null, undefined, {}, NaN]) {
      expect(parseUiGrade(bad)).toBeNull();
    }
  });
});
