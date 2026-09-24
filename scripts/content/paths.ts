import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const CONTENT_ROOT = resolve(process.cwd(), 'content');
export const DECKS_ROOT = join(CONTENT_ROOT, 'decks');

export interface DeckDir {
  /** Directory name, e.g. `01-linux`. Ordering lives in deck.json, not here. */
  dir: string;
  deckJsonPath: string;
  topicPaths: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await readdir(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Walks `content/decks/*` and returns the files to validate or sync. An empty
 * result is not an error: in Phase 0 there is no content yet, and both scripts
 * must still exit 0 so `npm run check` is green.
 */
export async function findDecks(): Promise<DeckDir[]> {
  if (!(await exists(DECKS_ROOT))) return [];

  const entries = await readdir(DECKS_ROOT, { withFileTypes: true });
  const decks: DeckDir[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const deckDir = join(DECKS_ROOT, entry.name);
    const topicsDir = join(deckDir, 'topics');
    const topicPaths = (await exists(topicsDir))
      ? (await readdir(topicsDir))
          .filter((name) => name.endsWith('.json'))
          .sort((a, b) => a.localeCompare(b))
          .map((name) => join(topicsDir, name))
      : [];
    decks.push({
      dir: entry.name,
      deckJsonPath: join(deckDir, 'deck.json'),
      topicPaths,
    });
  }

  return decks;
}

export async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as unknown;
}

/** Repo-relative path, so error messages are clickable in a terminal. */
export function relative(path: string): string {
  return path.startsWith(process.cwd() + '/') ? path.slice(process.cwd().length + 1) : path;
}
