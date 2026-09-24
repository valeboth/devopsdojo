import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cardBody, type CardType } from '../src/lib/cards/schemas';

/**
 * Fills the LOCAL D1 with one deck, two topics and 20 cards so the UI has
 * something to render before `content/` exists (§14).
 *
 * Local only, by construction: it shells out to `wrangler d1 execute --local`
 * and there is no code path here that can reach `--remote`. The cards are
 * obviously synthetic — real content lives in `content/` and goes through
 * `content:sync`.
 */

const DB_NAME = 'devopsdojo-db';
const NOW = Date.UTC(2026, 0, 1);

interface SeedCard {
  id: string;
  topicId: string;
  type: CardType;
  difficulty: number;
  tags: string[];
  prompt: string;
  payload: unknown;
  answer: unknown;
}

function sql(value: string | number | null): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/** Deterministic, so re-seeding does not churn content_hash for identical rows. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const TOPICS = [
  {
    id: 'linux.permissions',
    name: 'File permissions',
    concept:
      'Every file carries three permission triads — owner, group, other — and each is read/write/execute. `chmod` sets them, `chown` changes who they apply to.',
    recap: 'Octal counts rwx as 4/2/1 per triad; symbolic mode says who, what and how.',
  },
  {
    id: 'linux.processes',
    name: 'Processes and signals',
    concept:
      'A process is a running program with a pid, a parent and an exit status. Signals are the kernel-level way to ask it to stop, reload or die.',
    recap: 'SIGTERM asks, SIGKILL forces, and only the former can be trapped.',
  },
] as const;

function optionCard(index: number, topicId: string, difficulty: number): SeedCard {
  const options = ['a', 'b', 'c', 'd'].map((letter, i) => ({
    id: letter,
    text: `Sample answer ${index}-${i + 1}`,
  }));
  return {
    id: `${topicId}.seed-${String(index).padStart(2, '0')}`,
    topicId,
    type: 'choice',
    difficulty,
    tags: index % 3 === 0 ? ['placement', 'seed'] : ['seed'],
    prompt: `Seed question ${index}: which option is correct?`,
    payload: { options },
    answer: {
      correct_option_id: 'b',
      explanation: `Placeholder explanation for seed card ${index}; real content comes from content/.`,
    },
  };
}

function fillCard(index: number, topicId: string, difficulty: number): SeedCard {
  return {
    id: `${topicId}.seed-${String(index).padStart(2, '0')}`,
    topicId,
    type: 'fill',
    difficulty,
    tags: ['seed'],
    prompt: `Seed question ${index}: complete the command.`,
    payload: { before: 'chmod ', after: ' script.sh', hint: 'octal' },
    answer: {
      correct: ['700'],
      case_sensitive: false,
      explanation: `Placeholder explanation for seed card ${index}; real content comes from content/.`,
    },
  };
}

function swipeCard(index: number, topicId: string, difficulty: number): SeedCard {
  return {
    id: `${topicId}.seed-${String(index).padStart(2, '0')}`,
    topicId,
    type: 'swipe',
    difficulty,
    tags: ['seed'],
    prompt: `Seed flashcard ${index}`,
    payload: { front: `Seed front ${index}`, back: `Seed back ${index}` },
    answer: {
      explanation: `Placeholder explanation for seed card ${index}; real content comes from content/.`,
    },
  };
}

function buildCards(): SeedCard[] {
  const cards: SeedCard[] = [];
  for (let index = 1; index <= 20; index += 1) {
    const topicId = index <= 10 ? TOPICS[0].id : TOPICS[1].id;
    // Spread 1..5 so placement and difficulty filtering have something to pick.
    const difficulty = ((index - 1) % 5) + 1;
    const build = index % 7 === 0 ? swipeCard : index % 5 === 0 ? fillCard : optionCard;
    cards.push(build(index, topicId, difficulty));
  }
  return cards;
}

function statements(cards: readonly SeedCard[]): string[] {
  const out: string[] = [];

  // Delete first so seeding twice is idempotent. Only seed rows are touched:
  // ON DELETE CASCADE clears the i18n and tag rows with them.
  out.push(`DELETE FROM decks WHERE id = 'linux';`);

  out.push(
    `INSERT INTO decks (id, order_idx, cert_target, published, is_expert) VALUES ('linux', 0, 'LPIC-1', 1, 0);`,
  );
  out.push(
    `INSERT INTO deck_i18n (deck_id, lang, title, description) VALUES ('linux', 'en', 'Linux', 'Seed deck for local development.'), ('linux', 'ro', 'Linux', 'Pachet de test pentru dezvoltare locală.');`,
  );

  TOPICS.forEach((topic, i) => {
    out.push(
      `INSERT INTO topics (id, deck_id, parent_id, order_idx, published) VALUES (${sql(topic.id)}, 'linux', NULL, ${i}, 1);`,
    );
    out.push(
      `INSERT INTO topic_i18n (topic_id, lang, name, concept_md, recap_md) VALUES (${sql(topic.id)}, 'en', ${sql(topic.name)}, ${sql(topic.concept)}, ${sql(topic.recap)});`,
    );
  });

  for (const card of cards) {
    const payloadJson = JSON.stringify(card.payload);
    const answerJson = JSON.stringify(card.answer);
    out.push(
      `INSERT INTO cards (id, topic_id, type, difficulty, source, source_url, archived, content_hash, updated_at) VALUES (${sql(card.id)}, ${sql(card.topicId)}, ${sql(card.type)}, ${card.difficulty}, 'seed:dev', NULL, 0, ${sql(hash(card.id + payloadJson + answerJson))}, ${NOW});`,
    );
    out.push(
      `INSERT INTO card_i18n (card_id, lang, prompt, payload_json, answer_json) VALUES (${sql(card.id)}, 'en', ${sql(card.prompt)}, ${sql(payloadJson)}, ${sql(answerJson)});`,
    );
    for (const tag of card.tags) {
      out.push(`INSERT INTO card_tags (card_id, tag) VALUES (${sql(card.id)}, ${sql(tag)});`);
    }
  }

  return out;
}

async function main(): Promise<number> {
  const cards = buildCards();

  // The seed goes through the same schemas as real content: a seed card that
  // the API would reject is a trap, not a fixture.
  for (const card of cards) {
    const parsed = cardBody.safeParse({
      type: card.type,
      payload: card.payload,
      answer: card.answer,
    });
    if (!parsed.success) {
      process.stderr.write(`seed card ${card.id} is invalid:\n`);
      process.stderr.write(`${JSON.stringify(parsed.error.issues, null, 2)}\n`);
      return 1;
    }
  }

  const dir = await mkdtemp(join(tmpdir(), 'devopsdojo-seed-'));
  const file = join(dir, 'seed.sql');
  await writeFile(file, `${statements(cards).join('\n')}\n`, 'utf8');

  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB_NAME, '--local', `--file=${file}`, '--yes'],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    process.stderr.write(
      `\nSeeding failed. Run \`npm run db:migrate:local\` first if the local DB has no tables.\n`,
    );
    return result.status ?? 1;
  }

  process.stdout.write(
    `\nSeeded 1 deck, ${TOPICS.length} topics and ${cards.length} cards into the local D1.\n`,
  );
  return 0;
}

process.exitCode = await main();
