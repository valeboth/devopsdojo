import type { Handle, RequestEvent } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth/better-auth';

type Lang = App.Locals['lang'];

function resolveLang(event: RequestEvent): Lang {
  const cookie = event.cookies.get('lang');
  if (cookie === 'ro' || cookie === 'en') return cookie;
  const header = event.request.headers.get('accept-language') ?? '';
  // Romanian is the primary audience; English only when clearly preferred.
  return /\ben\b/i.test(header) && !/\bro\b/i.test(header) ? 'en' : 'ro';
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  event.locals.lang = resolveLang(event);

  // Better Auth's own endpoints are served by src/routes/api/auth/[...all];
  // resolving a session here first would just duplicate the work.
  // During prerendering there is no platform env, and nothing prerendered
  // depends on a session.
  const isAuthRoute = event.url.pathname.startsWith('/api/auth');
  if (!isAuthRoute && event.platform?.env) {
    const auth = getAuth(event.platform);
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (session?.user) {
      event.locals.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image ?? null,
      };
    }
  }

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.lang),
  });
};
