import { CARD_TYPES } from '../../src/lib/cards/schemas';
import {
  countPlacementCards,
  missingPlacementDifficulties,
  MIN_CARDS_PER_PUBLISHED_TOPIC,
  type CardFile,
} from '../../src/lib/cards/content-schemas';
import { loadContent } from './load';

/**
 * Prints what `content/` actually contains (§14 tooling). Used to answer the
 * only two questions that matter while authoring: is this deck publishable yet,
 * and how far behind is the Romanian translation.
 */

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

function padLeft(value: string | number, width: number): string {
  return String(value).padStart(width);
}

function translatedCards(cards: readonly CardFile[]): number {
  return cards.filter((card) => card.i18n.ro?.prompt !== undefined).length;
}

function percent(part: number, whole: number): string {
  if (whole === 0) return '  —';
  return `${padLeft(Math.round((part / whole) * 100), 3)}%`;
}

async function main(): Promise<void> {
  const decks = await loadContent();

  if (decks.length === 0) {
    process.stdout.write('content/: no decks yet.\n');
    return;
  }

  const byType = new Map<string, number>(CARD_TYPES.map((type) => [type, 0]));
  const byDifficulty = new Map<number, number>([1, 2, 3, 4, 5].map((d) => [d, 0]));
  let totalCards = 0;
  let totalTranslated = 0;

  for (const { deck, topics } of decks) {
    const cards = topics.flatMap((topic) => topic.cards);
    const translated = translatedCards(cards);
    totalCards += cards.length;
    totalTranslated += translated;

    for (const card of cards) {
      byType.set(card.type, (byType.get(card.type) ?? 0) + 1);
      byDifficulty.set(card.difficulty, (byDifficulty.get(card.difficulty) ?? 0) + 1);
    }

    const state = deck.published ? 'published' : 'draft';
    process.stdout.write(
      `\n${deck.id} (${state}${deck.is_expert ? ', expert' : ''}) — ${deck.i18n.en.title}\n`,
    );
    process.stdout.write(
      `  ${topics.length} topic(s), ${cards.length} card(s), ro ${percent(translated, cards.length)}\n`,
    );

    const placement = countPlacementCards(cards);
    const missing = missingPlacementDifficulties(cards);
    process.stdout.write(
      `  placement: ${placement} card(s)${missing.length > 0 ? `, missing difficulty ${missing.join('/')}` : ', difficulty 1-5 covered'}\n`,
    );

    for (const topic of topics) {
      const short = topic.published ? '' : ' (draft)';
      const thin =
        topic.cards.length < MIN_CARDS_PER_PUBLISHED_TOPIC
          ? ` ← under ${MIN_CARDS_PER_PUBLISHED_TOPIC}`
          : '';
      process.stdout.write(
        `    ${pad(topic.id, 40)} ${padLeft(topic.cards.length, 3)} card(s) ro ${percent(
          translatedCards(topic.cards),
          topic.cards.length,
        )}${short}${thin}\n`,
      );
    }
  }

  process.stdout.write(
    `\ntotal: ${totalCards} card(s), ro ${percent(totalTranslated, totalCards)}\n`,
  );
  process.stdout.write(
    `by type: ${CARD_TYPES.map((type) => `${type} ${byType.get(type) ?? 0}`).join(', ')}\n`,
  );
  process.stdout.write(
    `by difficulty: ${[1, 2, 3, 4, 5].map((d) => `${d} → ${byDifficulty.get(d) ?? 0}`).join(', ')}\n`,
  );
}

await main();
