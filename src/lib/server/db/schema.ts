import { relations } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// All timestamps are unix milliseconds in UTC. The user's timezone is applied in
// one place only: deciding which calendar day a streak activity belongs to.

// ---------------------------------------------------------------------------
// Better Auth tables. Shapes are dictated by Better Auth's sqlite adapter; do
// not rename columns. Sessions live here (D5: no KV).
// ---------------------------------------------------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('idx_session_user').on(t.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    // OAuth-only (D3): no password column is ever populated, but Better Auth's
    // schema expects the field to exist.
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('idx_account_user').on(t.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('idx_verification_identifier').on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Application profile, extending the Better Auth user.
// ---------------------------------------------------------------------------

export const userProfile = sqliteTable('user_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  timezone: text('timezone').notNull().default('Europe/Bucharest'),
  uiLang: text('ui_lang', { enum: ['ro', 'en'] })
    .notNull()
    .default('ro'),
  contentLang: text('content_lang', { enum: ['ro', 'en'] })
    .notNull()
    .default('ro'),
  // Interleaving weight overrides and other per-user settings.
  settingsJson: text('settings_json').notNull().default('{}'),
  placementDone: integer('placement_done', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  lastSeenAt: integer('last_seen_at'),
});

// ---------------------------------------------------------------------------
// Content. Ids are stable slugs (D13) so that content:sync upserts are
// idempotent and PR diffs stay readable. English is canonical; the *_i18n
// tables hold translations and runtime falls back to 'en' (D9).
// ---------------------------------------------------------------------------

export const decks = sqliteTable(
  'decks',
  {
    id: text('id').primaryKey(), // 'linux'
    orderIdx: integer('order_idx').notNull(),
    certTarget: text('cert_target'), // 'LPIC-1,LPIC-2'
    published: integer('published', { mode: 'boolean' }).notNull().default(false),
    isExpert: integer('is_expert', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('idx_decks_published').on(t.published, t.orderIdx)],
);

export const deckI18n = sqliteTable(
  'deck_i18n',
  {
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    lang: text('lang', { enum: ['en', 'ro'] }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
  },
  (t) => [primaryKey({ columns: [t.deckId, t.lang] })],
);

export const topics = sqliteTable(
  'topics',
  {
    id: text('id').primaryKey(), // 'linux.permissions'
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    orderIdx: integer('order_idx').notNull(),
    published: integer('published', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('idx_topics_deck').on(t.deckId, t.orderIdx)],
);

export const topicI18n = sqliteTable(
  'topic_i18n',
  {
    topicId: text('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    lang: text('lang', { enum: ['en', 'ro'] }).notNull(),
    name: text('name').notNull(),
    conceptMd: text('concept_md').notNull(),
    recapMd: text('recap_md'),
  },
  (t) => [primaryKey({ columns: [t.topicId, t.lang] })],
);

export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(), // 'linux.permissions.chmod-basics-01'
    topicId: text('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: ['choice', 'multi', 'order', 'match', 'fill', 'log_tap', 'swipe'],
    }).notNull(),
    // 1..5. Level (junior/mid/senior/expert) is derived in code, never stored (D7).
    difficulty: integer('difficulty').notNull(),
    source: text('source'), // 'cert:LPIC-1:104.5' | 'whisper:lesson-12' | 'docs:...'
    sourceUrl: text('source_url'),
    // Cards removed from content/ are archived, never deleted: users' FSRS state
    // references them.
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    // Hash of the source JSON, so content:sync only emits SQL for real changes.
    contentHash: text('content_hash').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('idx_cards_topic').on(t.topicId, t.difficulty)],
);

export const cardI18n = sqliteTable(
  'card_i18n',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    lang: text('lang', { enum: ['en', 'ro'] }).notNull(),
    prompt: text('prompt').notNull(),
    payloadJson: text('payload_json').notNull(),
    answerJson: text('answer_json').notNull(), // includes the explanation
  },
  (t) => [primaryKey({ columns: [t.cardId, t.lang] })],
);

export const cardTags = sqliteTable(
  'card_tags',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(), // 'interview' | 'placement' | 'ckad' | ...
  },
  (t) => [primaryKey({ columns: [t.cardId, t.tag] }), index('idx_card_tags_tag').on(t.tag)],
);

// ---------------------------------------------------------------------------
// Per-user learning state.
// ---------------------------------------------------------------------------

export const userDeckLevels = sqliteTable(
  'user_deck_levels',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    level: text('level', { enum: ['junior', 'mid', 'senior'] }).notNull(),
    score: integer('score'), // 0..100
    source: text('source', { enum: ['placement', 'manual', 'inferred'] }).notNull(),
    setAt: integer('set_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.deckId] })],
);

// FSRS state per (user, card). Mirrors ts-fsrs's Card shape.
export const reviews = sqliteTable(
  'reviews',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    due: integer('due').notNull(),
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    elapsedDays: integer('elapsed_days').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    // ts-fsrs 5.x tracks the position within the learning/relearning steps.
    learningSteps: integer('learning_steps').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    state: integer('state').notNull().default(0), // ts-fsrs State enum
    lastReview: integer('last_review'),
    totalReviews: integer('total_reviews').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.cardId] }),
    index('idx_reviews_due').on(t.userId, t.due),
  ],
);

// Append-only: feeds the weekly recap, FSRS recalibration and debugging.
export const reviewLog = sqliteTable(
  'review_log',
  {
    id: text('id').primaryKey(), // ulid
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Deliberately not a foreign key: the log outlives content edits.
    cardId: text('card_id').notNull(),
    sessionId: text('session_id'),
    rating: integer('rating').notNull(), // ts-fsrs Rating 1..4
    correct: integer('correct', { mode: 'boolean' }).notNull(),
    elapsedMs: integer('elapsed_ms'),
    mode: text('mode', {
      enum: ['lesson', 'review', 'interview', 'placement', 'sandbox'],
    }).notNull(),
    reviewedAt: integer('reviewed_at').notNull(),
  },
  (t) => [index('idx_review_log_user_time').on(t.userId, t.reviewedAt)],
);

export const userTopicProgress = sqliteTable(
  'user_topic_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    topicId: text('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['locked', 'available', 'in_progress', 'completed', 'skipped'],
    }).notNull(),
    completedAt: integer('completed_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);

export const streaks = sqliteTable('streaks', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  // 'YYYY-MM-DD' in the user's timezone, not a timestamp: a streak is about
  // calendar days, and the boundary must not move when the user travels.
  lastActiveDate: text('last_active_date'),
});

// Named study_sessions because Better Auth owns `session` (D16).
export const studySessions = sqliteTable(
  'study_sessions',
  {
    id: text('id').primaryKey(), // ulid
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mode: text('mode', {
      enum: ['lesson', 'review', 'interview', 'placement', 'sandbox'],
    }).notNull(),
    deckId: text('deck_id').references(() => decks.id),
    topicId: text('topic_id').references(() => topics.id),
    // interview: stack/difficulty/duration. placement: the adaptive state, so an
    // abandoned run resumes where it stopped.
    configJson: text('config_json').notNull().default('{}'),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    cardsSeen: integer('cards_seen').notNull().default(0),
    cardsCorrect: integer('cards_correct').notNull().default(0),
    resultJson: text('result_json'), // per-deck score for interview/placement
  },
  (t) => [index('idx_study_sessions_user').on(t.userId, t.startedAt)],
);

// ---------------------------------------------------------------------------
// Relations (for Drizzle's relational queries).
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, { fields: [user.id], references: [userProfile.userId] }),
  streak: one(streaks, { fields: [user.id], references: [streaks.userId] }),
  deckLevels: many(userDeckLevels),
  reviews: many(reviews),
  studySessions: many(studySessions),
}));

export const decksRelations = relations(decks, ({ many }) => ({
  i18n: many(deckI18n),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  deck: one(decks, { fields: [topics.deckId], references: [decks.id] }),
  i18n: many(topicI18n),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  topic: one(topics, { fields: [cards.topicId], references: [topics.id] }),
  i18n: many(cardI18n),
  tags: many(cardTags),
}));
