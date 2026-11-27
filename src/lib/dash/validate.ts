import type { DashboardSpec } from '#lib/types.js';

const TYPES = new Set(['stat', 'bar', 'line', 'table', 'text']);
const AGGS = new Set(['count', 'sum', 'avg', 'min', 'max', 'distinct']);
const FORMATS = new Set(['number', 'mxn', 'usd', 'percent', 'date', 'link', 'pill', 'text']);
const isL10n = (v: unknown) =>
	!!v && typeof v === 'object' && typeof (v as { es?: unknown }).es === 'string' && typeof (v as { en?: unknown }).en === 'string';

/** Returns a list of problems; empty = valid. Shared by the server (save) and the editor (live). */
export function validateSpec(s: unknown): string[] {
	const e: string[] = [];
	if (!s || typeof s !== 'object') return ['spec must be an object'];
	const d = s as DashboardSpec;
	if (d.version !== 1) e.push('version must be 1');
	if (typeof d.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{1,59}$/.test(d.slug)) e.push('slug: 2–60 lowercase letters, digits, dashes');
	if (!isL10n(d.title) || !d.title.es.trim() || !d.title.en.trim()) e.push('title needs es and en');
	if (d.description !== undefined && !isL10n(d.description)) e.push('description needs es and en');
	if (d.tags !== undefined && (!Array.isArray(d.tags) || d.tags.some((t) => typeof t !== 'string'))) e.push('tags must be strings');
	for (const k of ['note', 'trilium'] as const)
		if (d[k] !== undefined && d[k] !== '' && !/^([A-Za-z0-9_-]{1,64}|https?:\/\/\S{1,500})$/.test(String(d[k]))) e.push(`${k}: a note id (letters, digits, - _) or an http(s) URL`);
	if (d.status !== undefined && d.status !== 'draft' && d.status !== 'rejected') e.push('status: draft or rejected');
	if (d.by !== undefined && (typeof d.by !== 'string' || d.by.length > 80)) e.push('by: up to 80 characters');
	if (!d.sources || typeof d.sources !== 'object' || !Object.keys(d.sources).length) e.push('at least one source');
	const srcs = new Set(Object.keys(d.sources ?? {}));
	for (const [k, src] of Object.entries(d.sources ?? {})) {
		if (!/^[a-z][a-z0-9_]{0,30}$/.test(k)) e.push(`source "${k}": name must be lowercase letters/digits/_`);
		if (!src || (typeof src.file !== 'string' && !Array.isArray(src.rows))) e.push(`source "${k}": needs file or rows`);
	}
	for (const f of d.filters ?? []) {
		if (!srcs.has(f.source)) e.push(`filter on ${f.field}: unknown source "${f.source}"`);
		if (!f.field) e.push('filter without field');
	}
	if (!Array.isArray(d.widgets)) return [...e, 'widgets must be a list'];
	d.widgets.forEach((w, i) => {
		const at = `widget ${i + 1} (${w?.type})`;
		if (!w || !TYPES.has(w.type)) return e.push(`widget ${i + 1}: type must be stat, bar, line, table or text`);
		if (w.type !== 'text' && !srcs.has(w.source ?? '')) e.push(`${at}: unknown source "${w.source ?? ''}"`);
		if (w.title !== undefined && !isL10n(w.title)) e.push(`${at}: title needs es and en`);
		if (w.span !== undefined && ![1, 2, 3, 4].includes(w.span)) e.push(`${at}: span 1–4`);
		if ('agg' in w && w.agg !== undefined) {
			if (!AGGS.has(w.agg)) e.push(`${at}: agg must be ${[...AGGS].join('/')}`);
			if (w.agg !== 'count' && !w.field) e.push(`${at}: ${w.agg} needs a field`);
		}
		if ('format' in w && w.format && !FORMATS.has(w.format)) e.push(`${at}: unknown format ${w.format}`);
		if (w.type === 'stat' && !w.agg) e.push(`${at}: needs agg`);
		if (w.type === 'bar' && (!w.groupBy || !w.agg)) e.push(`${at}: needs groupBy and agg`);
		if (w.type === 'line' && (!w.x || !w.agg)) e.push(`${at}: needs x and agg`);
		if (w.type === 'table' && (!Array.isArray(w.columns) || !w.columns.length)) e.push(`${at}: needs columns`);
		if (w.type === 'text' && !isL10n(w.text)) e.push(`${at}: text needs es and en`);
	});
	return e;
}
