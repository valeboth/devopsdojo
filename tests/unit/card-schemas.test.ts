import { describe, expect, it } from 'vitest';
import { cardBody, logLines } from '$lib/cards/schemas';
import {
  cardFile,
  countPlacementCards,
  missingPlacementDifficulties,
  payloadIdMismatch,
  topicFile,
  MIN_CARDS_PER_PUBLISHED_TOPIC,
} from '$lib/cards/content-schemas';

const EXPLANATION = '7 = rwx for the owner, 0 for group and others.';

function options(ids: readonly string[]) {
  return ids.map((id) => ({ id, text: `option ${id}` }));
}

function log(lines: number, marker = 'ImagePullBackOff') {
  return Array.from({ length: lines }, (_, i) =>
    i === 2 ? `line ${i} ${marker}` : `line ${i} ok`,
  ).join('\n');
}

describe('choice', () => {
  const valid = {
    type: 'choice' as const,
    payload: { options: options(['a', 'b', 'c', 'd']) },
    answer: { correct_option_id: 'b', explanation: EXPLANATION },
  };

  it('accepts exactly four distinct options with an existing answer', () => {
    expect(cardBody.safeParse(valid).success).toBe(true);
  });

  it('rejects an answer that points at no option', () => {
    const result = cardBody.safeParse({
      ...valid,
      answer: { ...valid.answer, correct_option_id: 'z' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects three or five options', () => {
    expect(
      cardBody.safeParse({ ...valid, payload: { options: options(['a', 'b', 'c']) } }).success,
    ).toBe(false);
    expect(
      cardBody.safeParse({ ...valid, payload: { options: options(['a', 'b', 'c', 'd', 'e']) } })
        .success,
    ).toBe(false);
  });

  it('rejects duplicate option ids', () => {
    expect(
      cardBody.safeParse({ ...valid, payload: { options: options(['a', 'a', 'c', 'd']) } }).success,
    ).toBe(false);
  });

  it('requires an explanation', () => {
    expect(cardBody.safeParse({ ...valid, answer: { correct_option_id: 'b' } }).success).toBe(
      false,
    );
  });
});

describe('multi', () => {
  const valid = {
    type: 'multi' as const,
    payload: { options: options(['a', 'b', 'c', 'd']) },
    answer: { correct_option_ids: ['a', 'c'], explanation: EXPLANATION },
  };

  it('accepts 2..4 correct ids out of 4..6 options', () => {
    expect(cardBody.safeParse(valid).success).toBe(true);
  });

  it('rejects a single correct id (that is a choice card)', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct_option_ids: ['a'] } })
        .success,
    ).toBe(false);
  });

  it('rejects marking every option correct', () => {
    expect(
      cardBody.safeParse({
        ...valid,
        answer: { ...valid.answer, correct_option_ids: ['a', 'b', 'c', 'd'] },
      }).success,
    ).toBe(false);
  });

  it('rejects repeated or unknown correct ids', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct_option_ids: ['a', 'a'] } })
        .success,
    ).toBe(false);
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct_option_ids: ['a', 'z'] } })
        .success,
    ).toBe(false);
  });
});

describe('order', () => {
  const valid = {
    type: 'order' as const,
    payload: { items: options(['a', 'b', 'c']) },
    answer: { correct_order: ['c', 'a', 'b'], explanation: EXPLANATION },
  };

  it('accepts a permutation of every item', () => {
    expect(cardBody.safeParse(valid).success).toBe(true);
  });

  it('rejects a partial order', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct_order: ['a', 'b'] } })
        .success,
    ).toBe(false);
  });

  it('rejects duplicates in the order', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct_order: ['a', 'a', 'b'] } })
        .success,
    ).toBe(false);
  });

  it('rejects an id that is not among the items', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct_order: ['a', 'b', 'z'] } })
        .success,
    ).toBe(false);
  });

  it('rejects fewer than three items', () => {
    expect(
      cardBody.safeParse({
        ...valid,
        payload: { items: options(['a', 'b']) },
        answer: { ...valid.answer, correct_order: ['a', 'b'] },
      }).success,
    ).toBe(false);
  });
});

describe('match', () => {
  const valid = {
    type: 'match' as const,
    payload: { left: options(['l1', 'l2', 'l3']), right: options(['r1', 'r2', 'r3']) },
    answer: {
      pairs: [
        { left_id: 'l1', right_id: 'r2' },
        { left_id: 'l2', right_id: 'r1' },
        { left_id: 'l3', right_id: 'r3' },
      ],
      explanation: EXPLANATION,
    },
  };

  it('accepts a full bijection', () => {
    expect(cardBody.safeParse(valid).success).toBe(true);
  });

  it('rejects leaving a left item unpaired', () => {
    expect(
      cardBody.safeParse({
        ...valid,
        answer: { ...valid.answer, pairs: valid.answer.pairs.slice(0, 2) },
      }).success,
    ).toBe(false);
  });

  it('rejects reusing a right item', () => {
    expect(
      cardBody.safeParse({
        ...valid,
        answer: {
          ...valid.answer,
          pairs: [
            { left_id: 'l1', right_id: 'r1' },
            { left_id: 'l2', right_id: 'r1' },
            { left_id: 'l3', right_id: 'r3' },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it('rejects a pair referencing an unknown id', () => {
    expect(
      cardBody.safeParse({
        ...valid,
        answer: {
          ...valid.answer,
          pairs: [
            { left_id: 'l1', right_id: 'r9' },
            { left_id: 'l2', right_id: 'r2' },
            { left_id: 'l3', right_id: 'r3' },
          ],
        },
      }).success,
    ).toBe(false);
  });
});

describe('fill', () => {
  const valid = {
    type: 'fill' as const,
    payload: { before: 'chmod ', after: ' script.sh', hint: 'octal' },
    answer: { correct: ['700', 'u+rwx'], case_sensitive: false, explanation: EXPLANATION },
  };

  it('accepts short answers and defaults case_sensitive to false', () => {
    const parsed = cardBody.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === 'fill') {
      expect(parsed.data.answer.case_sensitive).toBe(false);
    }
  });

  it('applies the default when case_sensitive is omitted', () => {
    const parsed = cardBody.safeParse({
      ...valid,
      answer: { correct: ['700'], explanation: EXPLANATION },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === 'fill') {
      expect(parsed.data.answer.case_sensitive).toBe(false);
    }
  });

  it('rejects an empty list of accepted answers', () => {
    expect(cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct: [] } }).success).toBe(
      false,
    );
  });

  it('rejects an accepted answer longer than 30 characters', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct: ['x'.repeat(31)] } })
        .success,
    ).toBe(false);
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct: ['x'.repeat(30)] } })
        .success,
    ).toBe(true);
  });

  it('rejects case-insensitive answers that only differ in case', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, correct: ['Root', 'root'] } })
        .success,
    ).toBe(false);
    expect(
      cardBody.safeParse({
        ...valid,
        answer: { ...valid.answer, case_sensitive: true, correct: ['Root', 'root'] },
      }).success,
    ).toBe(true);
  });
});

describe('log_tap', () => {
  const valid = {
    type: 'log_tap' as const,
    payload: { log: log(10) },
    answer: { target_line_substring: 'ImagePullBackOff', explanation: EXPLANATION },
  };

  it('accepts 8..15 log lines with a unique target', () => {
    expect(cardBody.safeParse(valid).success).toBe(true);
  });

  it('rejects a log with too few or too many lines', () => {
    expect(cardBody.safeParse({ ...valid, payload: { log: log(7) } }).success).toBe(false);
    expect(cardBody.safeParse({ ...valid, payload: { log: log(16) } }).success).toBe(false);
  });

  it('rejects a target that matches no line', () => {
    expect(
      cardBody.safeParse({
        ...valid,
        answer: { ...valid.answer, target_line_substring: 'CrashLoopBackOff' },
      }).success,
    ).toBe(false);
  });

  it('rejects a target that matches more than one line', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, target_line_substring: 'line' } })
        .success,
    ).toBe(false);
  });

  it('ignores blank lines when counting', () => {
    expect(logLines(`a\n\n  \nb\n`)).toEqual(['a', 'b']);
  });
});

describe('swipe', () => {
  it('accepts front/back with an explanation and has no gradable answer', () => {
    expect(
      cardBody.safeParse({
        type: 'swipe',
        payload: { front: 'What does `set -e` do?', back: 'Exits on the first failing command.' },
        answer: { explanation: EXPLANATION },
      }).success,
    ).toBe(true);
  });

  it('rejects an empty back side', () => {
    expect(
      cardBody.safeParse({
        type: 'swipe',
        payload: { front: 'q', back: '' },
        answer: { explanation: EXPLANATION },
      }).success,
    ).toBe(false);
  });
});

describe('unknown types', () => {
  it('are rejected by the discriminated union', () => {
    expect(cardBody.safeParse({ type: 'essay', payload: {}, answer: {} }).success).toBe(false);
  });
});

describe('cardFile', () => {
  const base = {
    id: 'linux.permissions.chmod-basics-01',
    type: 'choice' as const,
    difficulty: 2,
    tags: ['lpic-1'],
    source: 'cert:LPIC-1:104.5',
    i18n: {
      en: {
        prompt: 'Minimum permission for a script executable only by its owner?',
        payload: { options: options(['a', 'b', 'c', 'd']) },
        answer: { correct_option_id: 'b', explanation: EXPLANATION },
      },
    },
  };

  it('accepts a well-formed card', () => {
    expect(cardFile.safeParse(base).success).toBe(true);
  });

  it('requires at least one tag and a source', () => {
    expect(cardFile.safeParse({ ...base, tags: [] }).success).toBe(false);
    expect(cardFile.safeParse({ ...base, source: '' }).success).toBe(false);
  });

  it('requires source_url on interview cards', () => {
    expect(cardFile.safeParse({ ...base, tags: ['interview'] }).success).toBe(false);
    expect(
      cardFile.safeParse({ ...base, tags: ['interview'], source_url: 'https://lpi.org/x' }).success,
    ).toBe(true);
  });

  it('rejects a difficulty outside 1..5', () => {
    expect(cardFile.safeParse({ ...base, difficulty: 0 }).success).toBe(false);
    expect(cardFile.safeParse({ ...base, difficulty: 6 }).success).toBe(false);
  });

  it('rejects an English body that contradicts the declared type', () => {
    expect(
      cardFile.safeParse({
        ...base,
        type: 'log_tap',
      }).success,
    ).toBe(false);
  });

  it('rejects an id that is not <deck>.<topic>.<card>', () => {
    expect(cardFile.safeParse({ ...base, id: 'chmod-basics-01' }).success).toBe(false);
    expect(cardFile.safeParse({ ...base, id: 'Linux.Permissions.Chmod' }).success).toBe(false);
  });

  it('rejects a missing English translation', () => {
    expect(cardFile.safeParse({ ...base, i18n: { ro: base.i18n.en } }).success).toBe(false);
  });
});

describe('missingPlacementDifficulties', () => {
  const card = (difficulty: number, tags: string[]) => ({ difficulty, tags }) as never;

  it('reports nothing when placement cards cover 1..5', () => {
    const cards = [1, 2, 3, 4, 5].map((d) => card(d, ['placement']));
    expect(missingPlacementDifficulties(cards)).toEqual([]);
  });

  it('reports the gaps', () => {
    const cards = [1, 3, 5].map((d) => card(d, ['placement']));
    expect(missingPlacementDifficulties(cards)).toEqual([2, 4]);
  });

  it('ignores cards without the placement tag', () => {
    const cards = [1, 2, 3, 4, 5].map((d) => card(d, ['lpic-1']));
    expect(missingPlacementDifficulties(cards)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('§12.4 limits', () => {
  const valid = {
    type: 'choice' as const,
    payload: { options: options(['a', 'b', 'c', 'd']) },
    answer: { correct_option_id: 'b', explanation: EXPLANATION },
  };

  it('rejects an option longer than 80 characters', () => {
    const long = [{ id: 'a', text: 'x'.repeat(81) }, ...options(['b', 'c', 'd'])];
    expect(cardBody.safeParse({ ...valid, payload: { options: long } }).success).toBe(false);
    const edge = [{ id: 'a', text: 'x'.repeat(80) }, ...options(['b', 'c', 'd'])];
    expect(cardBody.safeParse({ ...valid, payload: { options: edge } }).success).toBe(true);
  });

  it('rejects options whose texts collide once trimmed and lowercased', () => {
    const collide = [
      { id: 'a', text: 'Root' },
      { id: 'b', text: ' root ' },
      ...options(['c', 'd']),
    ];
    expect(cardBody.safeParse({ ...valid, payload: { options: collide } }).success).toBe(false);
  });

  it('rejects an explanation shorter than 20 characters', () => {
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, explanation: 'Because.' } })
        .success,
    ).toBe(false);
    expect(
      cardBody.safeParse({ ...valid, answer: { ...valid.answer, explanation: 'x'.repeat(20) } })
        .success,
    ).toBe(true);
  });

  it('rejects an explanation that only repeats the correct option text', () => {
    const answerText = 'the setuid bit is what matters here';
    const payload = { options: [{ id: 'a', text: answerText }, ...options(['b', 'c', 'd'])] };
    expect(
      cardBody.safeParse({
        ...valid,
        payload,
        answer: { correct_option_id: 'a', explanation: ` ${answerText.toUpperCase()} ` },
      }).success,
    ).toBe(false);
  });

  it('applies the same text and distinctness rules to order and match items', () => {
    expect(
      cardBody.safeParse({
        type: 'order',
        payload: {
          items: [
            { id: 'a', text: 'Step' },
            { id: 'b', text: 'step' },
            { id: 'c', text: 'c' },
          ],
        },
        answer: { correct_order: ['a', 'b', 'c'], explanation: EXPLANATION },
      }).success,
    ).toBe(false);
    expect(
      cardBody.safeParse({
        type: 'match',
        payload: {
          left: [
            { id: 'l1', text: 'ls' },
            { id: 'l2', text: 'LS' },
            { id: 'l3', text: 'cat' },
          ],
          right: options(['r1', 'r2', 'r3']),
        },
        answer: {
          pairs: [
            { left_id: 'l1', right_id: 'r1' },
            { left_id: 'l2', right_id: 'r2' },
            { left_id: 'l3', right_id: 'r3' },
          ],
          explanation: EXPLANATION,
        },
      }).success,
    ).toBe(false);
  });
});

describe('cardFile prompt length', () => {
  const base = {
    id: 'linux.permissions.chmod-basics-02',
    type: 'choice' as const,
    difficulty: 2,
    tags: ['lpic-1'],
    source: 'cert:LPIC-1:104.5',
    i18n: {
      en: {
        prompt: 'Short prompt?',
        payload: { options: options(['a', 'b', 'c', 'd']) },
        answer: { correct_option_id: 'b', explanation: EXPLANATION },
      },
    },
  };

  it('rejects a prompt longer than 200 characters', () => {
    const long = { ...base, i18n: { en: { ...base.i18n.en, prompt: 'x'.repeat(201) } } };
    expect(cardFile.safeParse(long).success).toBe(false);
    const edge = { ...base, i18n: { en: { ...base.i18n.en, prompt: 'x'.repeat(200) } } };
    expect(cardFile.safeParse(edge).success).toBe(true);
  });

  it('rejects an unknown key in the i18n block', () => {
    expect(cardFile.safeParse({ ...base, i18n: { ...base.i18n, de: base.i18n.en } }).success).toBe(
      false,
    );
  });
});

describe('payloadIdMismatch', () => {
  const card = (ro?: unknown) =>
    ({
      i18n: {
        en: { payload: { options: options(['a', 'b', 'c', 'd']) } },
        ro: ro === undefined ? undefined : { payload: ro },
      },
    }) as never;

  it('passes when there is no Romanian payload at all', () => {
    expect(payloadIdMismatch(card())).toBeNull();
  });

  it('passes when the Romanian payload reuses the same ids', () => {
    const ro = { options: [{ id: 'a', text: 'opțiunea a' }, ...options(['b', 'c', 'd'])] };
    expect(payloadIdMismatch(card(ro))).toBeNull();
  });

  it('fails when Romanian renumbers an option id', () => {
    const ro = { options: options(['a', 'b', 'c', 'x']) };
    expect(payloadIdMismatch(card(ro))).toMatch(/do not match/);
  });

  it('fails when Romanian drops an option', () => {
    const ro = { options: options(['a', 'b', 'c']) };
    expect(payloadIdMismatch(card(ro))).toMatch(/do not match/);
  });

  it('compares ids at any nesting depth', () => {
    const en = { left: options(['l1', 'l2']), right: options(['r1', 'r2']) };
    const mismatched = { left: options(['l1', 'l9']), right: options(['r1', 'r2']) };
    const same = {
      i18n: {
        en: { payload: en },
        ro: { payload: { left: options(['l1', 'l2']), right: options(['r1', 'r2']) } },
      },
    } as never;
    expect(payloadIdMismatch(same)).toBeNull();
    expect(
      payloadIdMismatch({ i18n: { en: { payload: en }, ro: { payload: mismatched } } } as never),
    ).toMatch(/do not match/);
  });
});

describe('countPlacementCards', () => {
  it('counts only tagged cards', () => {
    const cards = [
      { difficulty: 1, tags: ['placement'] },
      { difficulty: 2, tags: ['placement', 'lpic-1'] },
      { difficulty: 3, tags: ['lpic-1'] },
    ] as never[];
    expect(countPlacementCards(cards)).toBe(2);
  });
});

describe('topicFile', () => {
  const card = (suffix: string) => ({
    id: `linux.permissions.${suffix}`,
    type: 'choice' as const,
    difficulty: 2,
    tags: ['lpic-1'],
    source: 'cert:LPIC-1:104.5',
    i18n: {
      en: {
        prompt: 'Which permission bit?',
        payload: { options: options(['a', 'b', 'c', 'd']) },
        answer: { correct_option_id: 'b', explanation: EXPLANATION },
      },
    },
  });

  const base = {
    id: 'linux.permissions',
    order: 1,
    published: false,
    i18n: { en: { name: 'Permissions', concept_md: 'Three bits, three audiences.' } },
    cards: [card('c1')],
  };

  it('accepts a draft topic with a single card', () => {
    expect(topicFile.safeParse(base).success).toBe(true);
  });

  it('rejects a card id that is not prefixed with the topic id', () => {
    const stray = { ...base, cards: [{ ...card('c1'), id: 'linux.processes.c1' }] };
    expect(topicFile.safeParse(stray).success).toBe(false);
  });

  it('rejects duplicate card ids within a topic', () => {
    expect(topicFile.safeParse({ ...base, cards: [card('c1'), card('c1')] }).success).toBe(false);
  });

  it(`requires ${MIN_CARDS_PER_PUBLISHED_TOPIC} cards and a recap to publish`, () => {
    const withRecap = { ...base.i18n.en, recap_md: 'chmod takes octal or symbolic modes.' };
    expect(topicFile.safeParse({ ...base, published: true, i18n: { en: withRecap } }).success).toBe(
      false,
    );

    const enough = Array.from({ length: MIN_CARDS_PER_PUBLISHED_TOPIC }, (_, i) => card(`c${i}`));
    expect(
      topicFile.safeParse({ ...base, published: true, cards: enough, i18n: { en: withRecap } })
        .success,
    ).toBe(true);
    // Same card count, but no recap to read after the drill.
    expect(topicFile.safeParse({ ...base, published: true, cards: enough }).success).toBe(false);
  });

  it('rejects a concept longer than 1500 characters', () => {
    const long = { ...base, i18n: { en: { ...base.i18n.en, concept_md: 'x'.repeat(1501) } } };
    expect(topicFile.safeParse(long).success).toBe(false);
  });

  it('rejects a topic id that is not <deck>.<topic>', () => {
    expect(topicFile.safeParse({ ...base, id: 'permissions' }).success).toBe(false);
  });
});
