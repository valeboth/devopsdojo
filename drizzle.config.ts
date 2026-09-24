import { defineConfig } from 'drizzle-kit';

// Migrations are generated offline from schema.ts and committed to drizzle/.
// They are applied with `wrangler d1 migrations apply` (never by drizzle-kit
// push), so no database credentials are needed here.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
});
