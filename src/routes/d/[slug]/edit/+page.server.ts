import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDashboard } from '#lib/server/dashboards.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.canEdit) error(403, 'Viewers cannot edit dashboards');
	const spec = await getDashboard(params.slug);
	if (!spec) error(404, 'Dashboard not found');
	return { spec };
};
