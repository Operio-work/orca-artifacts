import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listDataFiles, resolveSource } from '#lib/server/dashboards.js';

/** GET            → every JSON data file a dashboard may use, with its lists and fields.
 *  POST {sources} → the rows for each source (used by the editor preview). */
export const GET: RequestHandler = async () => json(await listDataFiles());

export const POST: RequestHandler = async ({ request }) => {
	const b = await request.json().catch(() => null);
	const out: Record<string, unknown> = {};
	for (const [k, s] of Object.entries((b?.sources ?? {}) as Record<string, object>).slice(0, 12)) {
		out[k] = await resolveSource(s);
	}
	return json(out);
};
