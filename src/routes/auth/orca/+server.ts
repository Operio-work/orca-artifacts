import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BASE } from '#lib/base.js';
import { AUTH, ORCA_SECRET } from '#lib/server/config.js';
import { MAX_AGE_MS, SESSION_COOKIE, SESSION_DAYS, signSession, verifyPerson } from '#lib/server/identity.js';

// Tickets already used (until they would expire anyway): a copied link signs in once only.
const used = new Map<string, number>();

/** /auth/orca?ticket=…&return=/d/x — the Artifacts button in ORCA lands here. */
export const GET: RequestHandler = ({ url, cookies }) => {
	if (AUTH !== 'orca' || !ORCA_SECRET) error(404, 'ORCA sign-in is off');
	const ticket = url.searchParams.get('ticket') ?? '';
	const now = Date.now();
	for (const [k, until] of used) if (until < now) used.delete(k);
	const p = used.has(ticket) ? null : verifyPerson(ORCA_SECRET, ticket, now);
	if (!p) error(401, 'This sign-in link is old or was used already. Tap Artifacts in ORCA again.');
	used.set(ticket, now + 2 * MAX_AGE_MS);
	cookies.set(SESSION_COOKIE, signSession(ORCA_SECRET, p), {
		path: BASE || '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: SESSION_DAYS * 86400
	});
	// Only a path inside this app, never another site.
	const back = url.searchParams.get('return') ?? '/';
	const safe = /^\/(?!\/)[^\s\\]*$/.test(back) ? back : '/';
	redirect(303, BASE + safe);
};
