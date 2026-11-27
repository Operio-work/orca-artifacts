import { json } from '@sveltejs/kit';
import { loadCatalog } from '#lib/server/catalog.js';
export const GET = async () => json({ ok: true, items: (await loadCatalog()).length });
