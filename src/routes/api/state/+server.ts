import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setPin, updateOrganize } from '#lib/server/state.js';
import { review } from '#lib/server/review.js';

const KEY = /^(page|dashboard|archive):[a-z0-9][a-z0-9-]{0,80}$/;
const clean = (s: unknown, max = 40) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export const POST: RequestHandler = async ({ request, locals }) => {
	const b = await request.json().catch(() => null);
	if (!b || typeof b.op !== 'string') error(400, 'bad request');
	const key = b.key as string | undefined;
	if (key !== undefined && !KEY.test(key)) error(400, 'bad key');

	switch (b.op) {
		case 'approve':
		case 'reject': {
			if (!key) error(400, 'key required');
			const ok = await review(key, b.op, locals.user);
			if (!ok) error(409, 'not a draft');
			return json({ ok });
		}
		case 'pin':
			return json({ pins: await setPin(locals.user, key!, Boolean(b.on)) });
		case 'collection.create': {
			const name = clean(b.name);
			if (!name) error(400, 'name required');
			const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
			const s = await updateOrganize(`collection "${name}"`, (s) => void s.collections.push({ id, name }));
			if (key) await updateOrganize(`move ${key}`, (s) => void (s.items[key] = { ...s.items[key], collection: id }));
			return json({ id, collections: s.collections });
		}
		case 'collection.rename': {
			const name = clean(b.name);
			if (!name) error(400, 'name required');
			const s = await updateOrganize(`rename collection "${name}"`, (s) => {
				const c = s.collections.find((c) => c.id === b.id);
				if (c) c.name = name;
			});
			return json({ collections: s.collections });
		}
		case 'collection.delete': {
			const s = await updateOrganize('delete collection', (s) => {
				s.collections = s.collections.filter((c) => c.id !== b.id);
				for (const v of Object.values(s.items)) if (v.collection === b.id) delete v.collection;
			});
			return json({ collections: s.collections });
		}
		case 'collection.move': {
			// reorder: ids in new order
			const ids: string[] = Array.isArray(b.ids) ? b.ids : [];
			const s = await updateOrganize('reorder collections', (s) => {
				s.collections.sort((a, z) => ids.indexOf(a.id) - ids.indexOf(z.id));
			});
			return json({ collections: s.collections });
		}
		case 'assign': {
			if (!key) error(400, 'key required');
			const s = await updateOrganize(`move ${key}`, (s) => {
				const ok = !b.collection || s.collections.some((c) => c.id === b.collection);
				if (!ok) return;
				s.items[key] = { ...s.items[key], collection: b.collection || undefined };
			});
			return json({ item: s.items[key] ?? {} });
		}
		case 'tags': {
			if (!key) error(400, 'key required');
			const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map((t: unknown) => clean(t, 30).toLowerCase().replace(/^#+/, '')).filter(Boolean))].slice(0, 12) as string[];
			const s = await updateOrganize(`tags ${key}`, (s) => void (s.items[key] = { ...s.items[key], tags }));
			return json({ item: s.items[key] ?? {} });
		}
	}
	error(400, 'unknown op');
};
