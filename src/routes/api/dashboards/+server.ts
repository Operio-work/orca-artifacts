import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DashboardSpec } from '#lib/types.js';
import { validateSpec } from '#lib/dash/validate.js';
import { deleteDashboard, getDashboard, saveDashboard } from '#lib/server/dashboards.js';
import { RESERVED } from '#lib/server/config.js';

/** Save (create or update). Body: { spec, previousSlug? } */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.canEdit) error(403, 'viewers cannot edit');
	const b = await request.json().catch(() => null);
	const spec = b?.spec as DashboardSpec;
	const problems = validateSpec(spec);
	if (RESERVED.has(spec?.slug)) problems.push('slug is reserved');
	if (problems.length) return json({ ok: false, problems }, { status: 422 });
	const prev = typeof b.previousSlug === 'string' ? b.previousSlug : undefined;
	if ((!prev || prev !== spec.slug) && (await getDashboard(spec.slug))) {
		return json({ ok: false, problems: [`a dashboard "${spec.slug}" already exists`] }, { status: 409 });
	}
	await saveDashboard(spec, prev);
	return json({ ok: true, slug: spec.slug });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.canEdit) error(403, 'viewers cannot edit');
	const b = await request.json().catch(() => null);
	if (typeof b?.slug !== 'string') error(400, 'slug required');
	await deleteDashboard(b.slug);
	return json({ ok: true });
};
