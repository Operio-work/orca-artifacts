import type { LayoutServerLoad } from './$types';
import { BRAND } from '#lib/server/config.js';
import { loadCatalog } from '#lib/server/catalog.js';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:catalog');
	const drafts = (await loadCatalog()).filter((i) => i.status === 'draft').length;
	return { lang: locals.lang, user: locals.user, userName: locals.userName, brand: BRAND, drafts };
};
