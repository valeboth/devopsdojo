import {
  deckFile,
  topicFile,
  type DeckFile,
  type TopicFile,
} from '../../src/lib/cards/content-schemas';
import { findDecks, readJson, relative } from './paths';

export interface LoadedDeck {
  deck: DeckFile;
  topics: TopicFile[];
  /** Repo-relative path of deck.json, for error messages. */
  file: string;
}

/**
 * Reads and validates every deck. Throws on the first invalid file: the scripts
 * that use this (stats, sync) are not the place to report content errors —
 * `content:validate` is, and it lists them all at once.
 */
export async function loadContent(): Promise<LoadedDeck[]> {
  const loaded: LoadedDeck[] = [];

  for (const entry of await findDecks()) {
    const file = relative(entry.deckJsonPath);
    const deck = deckFile.parse(await readJson(entry.deckJsonPath));
    const topics: TopicFile[] = [];
    for (const topicPath of entry.topicPaths) {
      topics.push(topicFile.parse(await readJson(topicPath)));
    }
    topics.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    loaded.push({ deck, topics, file });
  }

  loaded.sort((a, b) => a.deck.order - b.deck.order || a.deck.id.localeCompare(b.deck.id));
  return loaded;
}
