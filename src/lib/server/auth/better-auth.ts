import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { ulid } from 'ulid';
import { getDb, schema } from '../db/client';
import { isEmailAllowed, parseAllowlist } from './allowlist';

type AuthEnv = App.Platform['env'];

/**
 * Better Auth needs the D1 binding and the OAuth secrets, which only exist per
 * request on Workers — so the instance is built per request instead of at module
 * scope. Instances are cached by env object identity: within one request every
 * caller (hooks, the catch-all route) gets the same instance, and the cache is
 * discarded with the isolate rather than growing.
 */
const cache = new WeakMap<AuthEnv, ReturnType<typeof create>>();

export type Auth = ReturnType<typeof create>;

export function getAuth(platform: App.Platform | undefined): Auth {
  const env = platform?.env;
  if (!env) {
    throw new Error('Platform env is missing; auth cannot be initialised outside the Worker.');
  }
  const existing = cache.get(env);
  if (existing) return existing;
  const auth = create(env, platform);
  cache.set(env, auth);
  return auth;
}

function create(env: AuthEnv, platform: App.Platform) {
  const db = getDb(platform);
  const allowlist = parseAllowlist(env.ALLOWED_EMAILS);

  return betterAuth({
    appName: 'devopsdojo',
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    // OAuth only (D3): hashing a password costs far more than the 10 ms CPU per
    // request that the Workers free plan allows.
    emailAndPassword: { enabled: false },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    // Both providers verify the address themselves, and the same person may use
    // GitHub one day and Google the next.
    account: {
      accountLinking: { enabled: true, trustedProviders: ['github', 'google'] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Reads the session from a signed cookie for 5 minutes before hitting D1
      // again: every page load needs the session, and D1 reads are the budget.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      useSecureCookies: (env.BETTER_AUTH_URL ?? '').startsWith('https://'),
      database: { generateId: () => ulid() },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isEmailAllowed(user.email, allowlist)) {
              // Returning false aborts the signup; Better Auth turns that into
              // a redirect to the error URL for browser flows.
              return false;
            }
            return { data: user };
          },
          after: async (user) => {
            const now = Date.now();
            await db
              .insert(schema.userProfile)
              .values({ userId: user.id, createdAt: now, lastSeenAt: now })
              .onConflictDoNothing();
            await db.insert(schema.streaks).values({ userId: user.id }).onConflictDoNothing();
          },
        },
      },
    },
    // Must stay last in the plugin list: it forwards Set-Cookie headers from
    // Better Auth to the SvelteKit response.
    plugins: [sveltekitCookies(getRequestEvent)],
  });
}
