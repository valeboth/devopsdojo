import type { z } from 'zod';
import {
  countPlacementCards,
  deckFile,
  missingPlacementDifficulties,
  payloadIdMismatch,
  topicFile,
  MIN_PLACEMENT_CARDS_PER_PUBLISHED_DECK,
  type CardFile,
} from '../../src/lib/cards/content-schemas';
import { findDecks, readJson, relative } from './paths';

/**
 * Validates everything under `content/` (§7). Runs in `npm run check` and in CI,
 * so a malformed card never reaches a PR — let alone D1.
 *
 * Exits 1 on the first failing run with every problem listed, not just the first
 * one: fixing content is a batch job.
 */

interface Problem {
  file: string;
  path: string;
  message: string;
}

function collect(file: string, error: z.ZodError): Problem[] {
  return error.issues.map((issue) => ({
    file,
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
}

async function main(): Promise<number> {
  const decks = await findDecks();
  const problems: Problem[] = [];
  const seenCardIds = new Map<string, string>();
  const seenTopicIds = new Map<string, string>();

  let deckCount = 0;
  let topicCount = 0;
  let cardCount = 0;

  for (const deck of decks) {
    const deckPath = relative(deck.deckJsonPath);
    let deckId: string | null = null;
    let deckPublished = false;

    try {
      const parsed = deckFile.safeParse(await readJson(deck.deckJsonPath));
      if (parsed.success) {
        deckId = parsed.data.id;
        deckPublished = parsed.data.published;
        deckCount += 1;
      } else {
        problems.push(...collect(deckPath, parsed.error));
      }
    } catch (error) {
      problems.push({
        file: deckPath,
        path: '(file)',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const deckCards: CardFile[] = [];

    for (const topicPath of deck.topicPaths) {
      const file = relative(topicPath);
      let topic;
      try {
        const parsed = topicFile.safeParse(await readJson(topicPath));
        if (!parsed.success) {
          problems.push(...collect(file, parsed.error));
          continue;
        }
        topic = parsed.data;
      } catch (error) {
        problems.push({
          file,
          path: '(file)',
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      topicCount += 1;

      // Ids are the join key between content and D1, so a collision across
      // files would silently overwrite one card with another during sync.
      const previousTopic = seenTopicIds.get(topic.id);
      if (previousTopic) {
        problems.push({
          file,
          path: 'id',
          message: `duplicate topic id, already defined in ${previousTopic}`,
        });
      } else {
        seenTopicIds.set(topic.id, file);
      }

      if (deckId !== null && !topic.id.startsWith(`${deckId}.`)) {
        problems.push({
          file,
          path: 'id',
          message: `topic id must start with the deck id "${deckId}."`,
        });
      }

      for (const card of topic.cards) {
        cardCount += 1;
        deckCards.push(card);
        const previousCard = seenCardIds.get(card.id);
        if (previousCard) {
          problems.push({
            file,
            path: `cards.${card.id}`,
            message: `duplicate card id, already defined in ${previousCard}`,
          });
        } else {
          seenCardIds.set(card.id, file);
        }

        const mismatch = payloadIdMismatch(card);
        if (mismatch) {
          problems.push({ file, path: `cards.${card.id}.i18n.ro.payload`, message: mismatch });
        }
      }
    }

    // Placement coverage is a deck-level property, so it can only be checked
    // once every topic of the deck has been read (§7.2, §12.4).
    const placementCount = countPlacementCards(deckCards);
    if (placementCount > 0 || deckPublished) {
      const missing = missingPlacementDifficulties(deckCards);
      if (missing.length > 0) {
        problems.push({
          file: deckPath,
          path: 'cards[tag=placement]',
          message: `placement cards must cover difficulty 1-5; missing: ${missing.join(', ')}`,
        });
      }
      if (deckPublished && placementCount < MIN_PLACEMENT_CARDS_PER_PUBLISHED_DECK) {
        problems.push({
          file: deckPath,
          path: 'cards[tag=placement]',
          message: `a published deck needs at least ${MIN_PLACEMENT_CARDS_PER_PUBLISHED_DECK} placement cards, found ${placementCount}`,
        });
      }
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      process.stderr.write(`${problem.file}: ${problem.path}: ${problem.message}\n`);
    }
    process.stderr.write(`\n${problems.length} problem(s) found.\n`);
    return 1;
  }

  process.stdout.write(
    decks.length === 0
      ? 'content/: no decks yet — nothing to validate.\n'
      : `content/: ${deckCount} deck(s), ${topicCount} topic(s), ${cardCount} card(s) valid.\n`,
  );
  return 0;
}

process.exitCode = await main();
