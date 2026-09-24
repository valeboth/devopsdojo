import type { RequestHandler } from './$types';
import { getAuth } from '$lib/server/auth/better-auth';

// Every OAuth callback, sign-in and sign-out request lands here. Better Auth
// owns the whole subtree, so the handler is the same for GET and POST.
const handler: RequestHandler = ({ request, platform }) => getAuth(platform).handler(request);

export const GET = handler;
export const POST = handler;
