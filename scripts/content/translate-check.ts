import {
  payloadIdMismatch,
  type CardFile,
  type TopicFile,
} from '../../src/lib/cards/content-schemas';
import { loadContent } from './load';

/**
 * Reports what is missing from the Romanian side (§7.4, D9). Romanian is
 * optional and falls back to English at read time, so a gap here is never a
 * build failure — except for a payload whose ids drift from the English one,
 * which grades a Romanian learner against the wrong option.
 *
 * Exit code: 1 only when a translation is *wrong*, 0 when it is merely absent.
 */

interface Gap {
  id: string;
  missing: string[];
}

function cardGaps(card: CardFile): string[] {
  const ro = card.i18n.ro;
  if (!ro) return ['(no ro block)'];
  const missing: string[] = [];
  if (ro.prompt === undefined) missing.push('prompt');
  // A translated prompt with an untranslated payload shows a Romanian question
  // over English options — worse than showing the card entirely in English.
  if (ro.prompt !== undefined && ro.payload === undefined) missing.push('payload');
  if (ro.prompt !== undefined && ro.answer === undefined) missing.push('answer (explanation)');
  return missing;
}

function topicGaps(topic: TopicFile): string[] {
  const ro = topic.i18n.ro;
  if (!ro) return ['(no ro block)'];
  const missing: string[] = [];
  if (ro.name === undefined) missing.push('name');
  if (ro.concept_md === undefined) missing.push('concept_md');
  if (topic.i18n.en.recap_md !== undefined && ro.recap_md === undefined) missing.push('recap_md');
  return missing;
}

async function main(): Promise<number> {
  const decks = await loadContent();

  if (decks.length === 0) {
    process.stdout.write('content/: no decks yet — nothing to translate.\n');
    return 0;
  }

  const errors: string[] = [];
  let untranslatedCards = 0;
  let totalCards = 0;

  for (const { deck, topics } of decks) {
    const lines: string[] = [];

    const deckMissing: string[] = [];
    if (!deck.i18n.ro) deckMissing.push('(no ro block)');
    else {
      if (deck.i18n.ro.title === undefined) deckMissing.push('title');
      if (deck.i18n.en.description !== undefined && deck.i18n.ro.description === undefined) {
        deckMissing.push('description');
      }
    }
    if (deckMissing.length > 0) lines.push(`  deck.json: ${deckMissing.join(', ')}`);

    for (const topic of topics) {
      const gaps: Gap[] = [];
      const missingTopic = topicGaps(topic);

      for (const card of topic.cards) {
        totalCards += 1;
        const missing = cardGaps(card);
        if (missing.length > 0) {
          untranslatedCards += 1;
          gaps.push({ id: card.id, missing });
        }
        const mismatch = payloadIdMismatch(card);
        if (mismatch) errors.push(`${card.id}: ${mismatch}`);
      }

      if (missingTopic.length === 0 && gaps.length === 0) continue;
      lines.push(`  ${topic.id}:`);
      if (missingTopic.length > 0) lines.push(`    topic: ${missingTopic.join(', ')}`);
      for (const gap of gaps) lines.push(`    ${gap.id}: ${gap.missing.join(', ')}`);
    }

    if (lines.length > 0) {
      process.stdout.write(`\n${deck.id}\n${lines.join('\n')}\n`);
    }
  }

  process.stdout.write(
    `\nro: ${totalCards - untranslatedCards}/${totalCards} card(s) translated.\n`,
  );

  if (errors.length > 0) {
    process.stderr.write('\nbroken translations (these break grading):\n');
    for (const error of errors) process.stderr.write(`  ${error}\n`);
    return 1;
  }

  return 0;
}

process.exitCode = await main();
