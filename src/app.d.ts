import type { D1Database } from '@cloudflare/workers-types';

declare global {
  namespace App {
    interface Error {
      code?: string;
    }

    interface Locals {
      /** Null for anonymous visitors; set by hooks.server.ts from the session. */
      user: {
        id: string;
        email: string;
        name: string;
        image: string | null;
      } | null;
      /** UI language resolved from the profile, cookie or Accept-Language. */
      lang: 'ro' | 'en';
    }

    interface PageData {
      user?: App.Locals['user'];
    }

    /**
     * Only `env` is declared here: adapter-cloudflare's ambient.d.ts already
     * types `ctx`, `context`, `caches` and `cf`, and redeclaring those would
     * conflict with it.
     *
     * Secrets are read from here rather than `$env/static/private` because the
     * Worker gets them at runtime via `wrangler secret put` (§15), so they are
     * not known at build time.
     */
    interface Platform {
      env: {
        DB: D1Database;
        BETTER_AUTH_SECRET: string;
        BETTER_AUTH_URL?: string;
        GITHUB_CLIENT_ID: string;
        GITHUB_CLIENT_SECRET: string;
        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;
        /** Comma-separated allowlist; empty or unset means signups are open. */
        ALLOWED_EMAILS?: string;
        PUBLIC_APP_URL?: string;
      };
    }
  }
}

export {};
