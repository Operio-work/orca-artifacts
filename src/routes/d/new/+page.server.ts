import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.canEdit) error(403, 'Viewers cannot add dashboards');
	return {};
};
