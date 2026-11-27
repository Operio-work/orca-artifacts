import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveShare } from '#lib/server/share.js';

/** Save what was shared to the app as a draft page. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.canEdit) error(403, 'viewers cannot add pages');
	const b = await request.json().catch(() => null);
	if (!b || typeof b !== 'object') error(400, 'JSON body required');
	const res = await saveShare(b, locals.userName || locals.user || 'local');
	return json(res, { status: res.ok ? 200 : 422 });
};
