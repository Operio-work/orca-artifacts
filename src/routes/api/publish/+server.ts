import { error, json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from './$types';
import { AUTH, PUBLISH_TOKEN } from '#lib/server/config.js';
import { publish } from '#lib/server/publish.js';

function authorized(h: string | null): boolean {
	if (!PUBLISH_TOKEN || !h?.startsWith('Bearer ')) return false;
	const a = Buffer.from(h.slice(7).trim());
	const b = Buffer.from(PUBLISH_TOKEN);
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Publish a page, dashboard or data from ORCA or a script. Off unless ARTIFACTS_PUBLISH_TOKEN is set. */
export const POST: RequestHandler = async ({ request }) => {
	if (!PUBLISH_TOKEN) error(404, 'publishing is off (set ARTIFACTS_PUBLISH_TOKEN)');
	if (!authorized(request.headers.get('authorization'))) error(401, 'bad token');
	const b = await request.json().catch(() => null);
	if (!b || typeof b !== 'object') error(400, 'JSON body required');
	const res = await publish(b as Record<string, unknown>);
	return json(res, { status: res.ok ? 200 : 422 });
};

/** Lets a publisher check the URL and token: { ok, publish: true }. */
export const GET: RequestHandler = async ({ request }) => {
	if (!PUBLISH_TOKEN) error(404, 'publishing is off');
	if (!authorized(request.headers.get('authorization'))) error(401, 'bad token');
	// sso: the app accepts ORCA sign-in tickets (/auth/orca), so ORCA's Artifacts button can sign people in.
	return json({ ok: true, publish: true, sso: AUTH === 'orca' });
};
