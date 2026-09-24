import { loadContent } from './load';

/**
 * Phase 2 (§14). Will upsert `content/` into D1 — decks, topics, cards and their
 * `*_i18n` rows — keyed by the stable slug ids, using `cards.content_hash` to
 * skip rows that have not changed and `cards.archived` instead of DELETE so a
 * removed card never orphans someone's FSRS state.
 *
 * Deliberately not implemented yet: writing it before the read paths exist means
 * guessing at the shape the queries need. Until then this is a loud stub rather
 * than a half-working writer, because a partial sync is worse than none.
 */

async function main(): Promise<number> {
  const decks = await loadContent();
  const cards = decks.reduce(
    (total, { topics }) => total + topics.reduce((n, topic) => n + topic.cards.length, 0),
    0,
  );

  process.stderr.write(
    `content:sync is not implemented yet (Phase 2).\n` +
      `${decks.length} deck(s) / ${cards} card(s) would be upserted into D1.\n` +
      `Use \`npm run content:validate\` and \`npm run seed:dev\` in the meantime.\n`,
  );
  return 1;
}

process.exitCode = await main();
