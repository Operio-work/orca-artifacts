import type { Handle } from '@sveltejs/kit/hooks';
import { serveSite } from '#lib/server/static.js';
import { AUTH, USER_HEADER, USER_NAME_HEADER, type AuthMode } from '#lib/server/config.js';

/** Who is viewing, by sign-in mode. No identity → "local" (one shared set of pins). */
export function viewer(h: Headers, mode: AuthMode = AUTH, userHeader = USER_HEADER, nameHeader = USER_NAME_HEADER) {
	let user = '';
	let name = '';
	if (mode === 'tailscale') {
		user = h.get('tailscale-user-login') ?? '';
		name = h.get('tailscale-user-name') ?? '';
	} else if (mode === 'header') {
		user = h.get(userHeader) ?? '';
		name = nameHeader ? (h.get(nameHeader) ?? '') : '';
	}
	user = user.trim().slice(0, 200) || 'local';
	return { user, name: name.trim().slice(0, 200) || user };
}

/** First es/en entry in an Accept-Language header, by q-value; anything else -> 'es'. */
export function fromAcceptLanguage(h: string | null): 'es' | 'en' {
	let best: 'es' | 'en' = 'es', bestQ = -1;
	for (const part of (h ?? '').split(',')) {
		const [tag, ...params] = part.trim().split(';');
		const m = /^(es|en)(-|$)/i.exec(tag.trim());
		if (!m) continue;
		const q = Number(params.find((x) => x.trim().startsWith('q='))?.split('=')[1] ?? 1);
		if (q > bestQ) { bestQ = q; best = m[1].toLowerCase() as 'es' | 'en'; }
	}
	return best;
}

const APP_PREFIXES = ['/d/', '/api/', '/_app/', '/healthz', '/manifest.webmanifest', '/service-worker.js', '/icons/'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	// Everything that isn't the app is a file under site/ (the pages that were there before the app).
	if (pathname !== '/' && pathname !== '/d' && !APP_PREFIXES.some((p) => pathname.startsWith(p))) {
		const res = await serveSite(pathname);
		if (res) return res;
	}

	const who = viewer(event.request.headers);
	event.locals.user = who.user;
	event.locals.userName = who.name;
	// Saved choice (cookie) wins; otherwise follow the browser's language; Spanish is the fallback.
	const saved = event.cookies.get('lang');
	event.locals.lang = saved === 'en' || saved === 'es' ? saved : fromAcceptLanguage(event.request.headers.get('accept-language'));

	// JSON writes must come from this origin (cross-site JSON POSTs need a preflight we never answer).
	if (pathname.startsWith('/api/') && event.request.method !== 'GET') {
		const ct = event.request.headers.get('content-type') ?? '';
		if (!ct.startsWith('application/json')) return new Response('json only', { status: 415 });
	}

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.lang)
	});
};
