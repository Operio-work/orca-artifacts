import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDashboard, resolveAll } from '#lib/server/dashboards.js';
import { readPins } from '#lib/server/state.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const spec = await getDashboard(params.slug);
	if (!spec) error(404, 'Dashboard not found');
	const [data, pins] = await Promise.all([resolveAll(spec), readPins(locals.user)]);
	return { spec, data, pinned: pins.includes(`dashboard:${spec.slug}`) };
};
