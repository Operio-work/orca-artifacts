import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { CatalogItem, DashboardSpec } from '#lib/types.js';
import { BRAND, SITE_DIR, SITE_SKIP } from './config';
import { readJson } from './json';
import { listDashboards } from './dashboards';

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Page titles end in " · <app name>"; drop that for the card. */
const TITLE_SUFFIX = new RegExp(`\\s*·\\s*(${esc(BRAND.name)}|ORCA Artifacts)\\s*$`);

interface PageMeta {
	title?: { es?: string; en?: string };
	description?: { es?: string; en?: string };
	tags?: string[];
	note?: string;
	trilium?: string; // old name for note
	status?: 'draft' | 'rejected';
	by?: string;
	hidden?: boolean;
}

const l = (v: { es?: string; en?: string } | undefined, fb = '') => ({
	es: v?.es || v?.en || fb,
	en: v?.en || v?.es || fb
});

async function titleFromHtml(file: string): Promise<string> {
	try {
		const html = await readFile(file, 'utf8');
		const m = html.match(/<title>([^<]*)<\/title>/i);
		return (m?.[1] ?? '').replace(TITLE_SUFFIX, '').trim();
	} catch {
		return '';
	}
}

async function pages(): Promise<CatalogItem[]> {
	const out: CatalogItem[] = [];
	for (const ent of await readdir(SITE_DIR, { withFileTypes: true })) {
		if (!ent.isDirectory() || SITE_SKIP.has(ent.name) || ent.name.startsWith('.')) continue;
		const dir = join(SITE_DIR, ent.name);
		const index = join(dir, 'index.html');
		const st = await stat(index).catch(() => null);
		if (!st) continue;
		const meta = await readJson<PageMeta>(join(dir, 'meta.json'), {});
		if (meta.hidden || meta.status === 'rejected') continue;
		const data = await readJson<{ updated?: string }>(join(dir, 'data.json'), {});
		const fallback = (await titleFromHtml(index)) || ent.name;
		out.push({
			key: `page:${ent.name}`,
			kind: 'page',
			slug: ent.name,
			href: `/${ent.name}/`,
			title: l(meta.title, fallback),
			description: l(meta.description),
			tags: meta.tags ?? [],
			note: meta.note ?? meta.trilium,
			status: meta.status === 'draft' ? 'draft' : undefined,
			by: typeof meta.by === 'string' ? meta.by.slice(0, 80) : undefined,
			updated: data.updated ?? st.mtime.toISOString()
		});
	}
	return out;
}

interface ArchiveRow {
	slug: string;
	name: string;
	date?: string;
	kind?: string;
	page: string;
	note?: string;
	trilium?: string;
	card_es?: string;
	card_en?: string;
}

async function archive(): Promise<CatalogItem[]> {
	const d = await readJson<{ items?: ArchiveRow[] }>(join(SITE_DIR, 'archive', 'data.json'), {});
	return (d.items ?? []).map((r) => ({
		key: `archive:${r.slug}`,
		kind: 'archive' as const,
		slug: r.slug,
		href: `/archive/${r.page}`,
		title: { es: r.name, en: r.name },
		description: l({ es: r.card_es, en: r.card_en }),
		tags: [],
		note: r.note ?? r.trilium,
		updated: r.date,
		origin: r.kind
	}));
}

function dashItem(s: DashboardSpec): CatalogItem {
	return {
		key: `dashboard:${s.slug}`,
		kind: 'dashboard',
		slug: s.slug,
		href: `/d/${s.slug}`,
		title: l(s.title, s.slug),
		description: l(s.description),
		tags: s.tags ?? [],
		note: s.note ?? s.trilium,
		status: s.status === 'draft' ? 'draft' : undefined,
		by: s.by,
		updated: s.updated
	};
}

export async function loadCatalog(): Promise<CatalogItem[]> {
	const [p, a, d] = await Promise.all([pages(), archive(), listDashboards()]);
	return [...d.filter((s) => s.status !== 'rejected').map(dashItem), ...p, ...a];
}
