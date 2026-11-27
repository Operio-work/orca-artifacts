import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { serveSite } from '#lib/server/static.js';
import { BASE } from '#lib/base.js';
import { AUTH, ORCA_SECRET, ORCA_URL, USER_HEADER, USER_NAME_HEADER, type AuthMode } from '#lib/server/config.js';
import { IDENTITY_HEADER, SESSION_COOKIE, canEdit, verifyPerson, verifySession, type Role } from '#lib/server/identity.js';
import { startAlerts } from '#lib/server/alerts.js';

/** Who is viewing, by sign-in mode (none / tailscale / header). No identity → "local" (one shared set of pins). */
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

const APP_PREFIXES = ['/d/', '/api/', '/_app/', '/auth/', '/share', '/healthz', '/manifest.webmanifest', '/service-worker.js', '/icons/'];
// Reachable before sign-in: the app's own code and icons, health, the sign-in itself, and
// publishing (it has its own token).
const OPEN = ['/_app/', '/icons/', '/healthz', '/manifest.webmanifest', '/service-worker.js', '/auth/orca', '/api/publish'];

function signInPage(lang: 'es' | 'en') {
	const es = lang === 'es';
	const link = ORCA_URL ? `<p><a href="${ORCA_URL.replace(/"/g, '&quot;')}">${es ? 'Abrir ORCA' : 'Open ORCA'}</a></p>` : '';
	return new Response(
		`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ORCA Artifacts</title>` +
			`<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#27272a;line-height:1.5">` +
			`<h1 style="font-size:1.25rem">${es ? 'Entra desde ORCA' : 'Sign in from ORCA'}</h1>` +
			`<p>${es ? 'Abre tu panel de ORCA y toca <b>Artifacts</b>. Te trae aquí con tu sesión.' : 'Open your ORCA panel and tap <b>Artifacts</b>. It brings you here signed in.'}</p>${link}`,
		{ status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
	);
}

export const init: ServerInit = () => {
	startAlerts();
};

export const handle: Handle = async ({ event, resolve }) => {
	const full = event.url.pathname;
	if (BASE && full !== BASE && !full.startsWith(BASE + '/')) return new Response('not found', { status: 404 });
	const pathname = full.slice(BASE.length) || '/';

	// Saved choice (cookie) wins; otherwise follow the browser's language; Spanish is the fallback.
	const saved = event.cookies.get('lang');
	event.locals.lang = saved === 'en' || saved === 'es' ? saved : fromAcceptLanguage(event.request.headers.get('accept-language'));

	let role: Role | 'admin' = 'admin';
	if (AUTH === 'orca') {
		const p =
			verifyPerson(ORCA_SECRET, event.request.headers.get(IDENTITY_HEADER)) ?? verifySession(ORCA_SECRET, event.cookies.get(SESSION_COOKIE));
		if (p) {
			event.locals.user = p.id;
			event.locals.userName = p.name;
			role = p.role;
		} else if (!OPEN.some((o) => pathname.startsWith(o))) {
			if (pathname.startsWith('/api/')) return new Response(JSON.stringify({ message: 'sign in from ORCA' }), { status: 401, headers: { 'content-type': 'application/json' } });
			return signInPage(event.locals.lang);
		}
	} else {
		const who = viewer(event.request.headers);
		event.locals.user = who.user;
		event.locals.userName = who.name;
	}
	event.locals.user ??= '';
	event.locals.userName ??= '';
	event.locals.role = role;
	event.locals.canEdit = canEdit(role);

	// Everything that isn't the app is a file under site/ (the pages that were there before the app).
	if (pathname !== '/' && pathname !== '/d' && !APP_PREFIXES.some((p) => pathname.startsWith(p))) {
		const res = await serveSite(pathname);
		if (res) return res;
	}

	// JSON writes must come from this origin (cross-site JSON POSTs need a preflight we never answer).
	if (pathname.startsWith('/api/') && event.request.method !== 'GET') {
		const ct = event.request.headers.get('content-type') ?? '';
		if (!ct.startsWith('application/json')) return new Response('json only', { status: 415 });
	}

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.lang)
	});
};
