import { fail, redirect } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth/better-auth';
import type { Actions, PageServerLoad } from './$types';

const PROVIDERS = ['github', 'google'] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);
}

/** Only same-origin paths, so `?next=` cannot be used as an open redirect. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    redirect(303, safeNext(event.url.searchParams.get('next')));
  }
  return { next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
  // A POST form rather than a client-side auth library: less JS on a phone, and
  // sign-in still works if the bundle has not loaded.
  default: async (event) => {
    const data = await event.request.formData();
    const provider = data.get('provider');
    if (!isProvider(provider)) {
      return fail(400, { message: 'Unknown provider' });
    }
    const next = safeNext(String(data.get('next') ?? '/'));
    const origin = event.url.origin;

    const auth = getAuth(event.platform);
    const result = await auth.api.signInSocial({
      body: {
        provider,
        callbackURL: `${origin}${next}`,
        errorCallbackURL: `${origin}/login?error=oauth`,
        // First-time visitors go through onboarding instead of straight to the
        // requested page.
        newUserCallbackURL: `${origin}/onboarding`,
        // We need the URL back so we can redirect ourselves.
        disableRedirect: true,
      },
      headers: event.request.headers,
    });

    if (!result.url) {
      return fail(502, { message: 'Provider did not return an authorization URL' });
    }
    redirect(303, result.url);
  },
};
