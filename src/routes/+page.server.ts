import type { PageServerLoad } from './$types';
import { loadCatalog } from '#lib/server/catalog.js';
import { readOrganize, readPins } from '#lib/server/state.js';
import type { ViewItem } from '#lib/types.js';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:catalog');
	const [catalog, org, pins] = await Promise.all([loadCatalog(), readOrganize(), readPins(locals.user)]);
	const pinSet = new Set(pins);
	const colIds = new Set(org.collections.map((c) => c.id));
	const items: ViewItem[] = catalog.map((c) => {
		const o = org.items[c.key] ?? {};
		return {
			...c,
			collection: o.collection && colIds.has(o.collection) ? o.collection : undefined,
			allTags: [...new Set([...c.tags, ...(o.tags ?? [])])].sort(),
			pinned: pinSet.has(c.key)
		};
	});
	return { items, pins, collections: org.collections };
};
