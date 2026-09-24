import { error, redirect, type RequestEvent } from '@sveltejs/kit';

type User = NonNullable<App.Locals['user']>;

/**
 * For API routes: a missing session is a 401, never a redirect — the client is
 * fetch(), not a browser navigation.
 */
export function requireUser(event: RequestEvent): User {
  const user = event.locals.user;
  if (!user) {
    error(401, { message: 'Authentication required', code: 'unauthenticated' });
  }
  return user;
}

/**
 * For page loads: send the visitor to /login and come back afterwards.
 */
export function requireUserPage(event: RequestEvent): User {
  const user = event.locals.user;
  if (!user) {
    const next = event.url.pathname + event.url.search;
    redirect(303, `/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}
