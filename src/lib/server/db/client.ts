import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Db = DrizzleD1Database<typeof schema>;

/**
 * Builds the Drizzle client for a request. The D1 binding lives on
 * `event.platform.env`, which adapter-cloudflare emulates in `vite dev` from
 * wrangler.toml. Failing loudly beats a mystery "cannot read property prepare".
 */
export function getDb(platform: App.Platform | undefined): Db {
  const d1 = platform?.env?.DB;
  if (!d1) {
    throw new Error(
      'D1 binding DB is missing. Check [[d1_databases]] in wrangler.toml and that the local DB was migrated (npm run db:migrate:local).',
    );
  }
  // Every column name is spelled out in schema.ts, so no `casing` strategy is
  // needed here.
  return drizzle(d1, { schema });
}

export { schema };
