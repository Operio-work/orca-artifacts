import { tz } from '#lib/tz.js';
import type { Agg, Rows, Where } from '#lib/types.js';

export function get(row: unknown, path: string): unknown {
	if (!path) return undefined;
	let o: unknown = row;
	for (const k of path.split('.')) {
		if (o == null || typeof o !== 'object') return undefined;
		o = (o as Record<string, unknown>)[k];
	}
	return o;
}

export const keyOf = (v: unknown) => (v == null || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v));

/** where: { field: value | [values] | {in,not,gte,lte,gt,lt,contains,exists} } */
export function matches(row: unknown, where?: Where): boolean {
	if (!where) return true;
	for (const [field, cond] of Object.entries(where)) {
		const v = get(row, field);
		if (Array.isArray(cond)) {
			if (!cond.map(String).includes(keyOf(v))) return false;
		} else if (cond && typeof cond === 'object') {
			const c = cond as Record<string, unknown>;
			if ('in' in c && !(c.in as unknown[]).map(String).includes(keyOf(v))) return false;
			if ('not' in c && (Array.isArray(c.not) ? (c.not as unknown[]).map(String) : [String(c.not)]).includes(keyOf(v))) return false;
			if ('exists' in c && (v != null && v !== '') !== Boolean(c.exists)) return false;
			if ('contains' in c && !String(v ?? '').toLowerCase().includes(String(c.contains).toLowerCase())) return false;
			for (const op of ['gte', 'lte', 'gt', 'lt'] as const) {
				if (!(op in c)) continue;
				const a = cmp(v, c[op]);
				if (a === null) return false;
				if (op === 'gte' && a < 0) return false;
				if (op === 'lte' && a > 0) return false;
				if (op === 'gt' && a <= 0) return false;
				if (op === 'lt' && a >= 0) return false;
			}
		} else if (keyOf(v) !== keyOf(cond)) return false;
	}
	return true;
}

function cmp(a: unknown, b: unknown): number | null {
	if (a == null) return null;
	const isDate = (x: unknown) => /^\d{4}-\d{2}/.test(String(x));
	if (typeof b === 'number' || (!isDate(b) && String(b).trim() !== '' && !Number.isNaN(Number(b)))) {
		const na = num(a);
		return na === null ? null : na - Number(b);
	}
	return String(a).localeCompare(String(b));
}

const num = (v: unknown) => {
	if (typeof v !== 'number' && (typeof v !== 'string' || v.trim() === '')) return null;
	const n = typeof v === 'number' ? v : Number(v);
	return Number.isFinite(n) ? n : null;
};

export function aggregate(rows: Rows, agg: Agg, field?: string): number {
	if (agg === 'count') return field ? rows.filter((r) => { const v = get(r, field); return v != null && v !== ''; }).length : rows.length;
	if (agg === 'distinct') return new Set(rows.map((r) => keyOf(get(r, field ?? '')))).size;
	const vals = rows.map((r) => num(get(r, field ?? ''))).filter((n): n is number => n !== null);
	if (!vals.length) return 0;
	if (agg === 'sum') return vals.reduce((a, b) => a + b, 0);
	if (agg === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
	if (agg === 'min') return Math.min(...vals);
	return Math.max(...vals);
}

export function groupBy(rows: Rows, by: string, agg: Agg, field?: string, limit = 12) {
	const groups = new Map<string, Rows>();
	for (const r of rows) {
		const raw = get(r, by);
		const keys = Array.isArray(raw) ? (raw.length ? raw.map(keyOf) : ['—']) : [keyOf(raw)];
		for (const k of keys) (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
	}
	const all = [...groups].map(([key, rs]) => ({ key, value: aggregate(rs, agg, field) })).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
	if (all.length <= limit) return all;
	const head = all.slice(0, limit - 1);
	const restRows = all.slice(limit - 1).flatMap((g) => groups.get(g.key)!);
	return [...head, { key: '__other__', value: aggregate(restRows, agg, field), other: all.length - limit + 1 }];
}

/** Calendar day (YYYY-MM-DD) in the library's time zone for ISO timestamps; plain dates pass through. */
export function day(v: unknown): string | null {
	if (v == null || v === '') return null;
	const s = String(v);
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString('en-CA', { timeZone: tz.zone });
}

export function bucketOf(d: string, bucket: 'day' | 'week' | 'month'): string {
	if (bucket === 'month') return d.slice(0, 7);
	if (bucket === 'day') return d;
	const dt = new Date(d + 'T00:00:00Z');
	const dow = (dt.getUTCDay() + 6) % 7; // Monday start
	dt.setUTCDate(dt.getUTCDate() - dow);
	return dt.toISOString().slice(0, 10);
}

function nextBucket(b: string, bucket: 'day' | 'week' | 'month'): string {
	if (bucket === 'month') {
		const [y, m] = b.split('-').map(Number);
		return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
	}
	const dt = new Date(b + 'T00:00:00Z');
	dt.setUTCDate(dt.getUTCDate() + (bucket === 'week' ? 7 : 1));
	return dt.toISOString().slice(0, 10);
}

export interface Series { key: string; points: { x: string; y: number }[] }

/** Time series with empty buckets filled (so gaps read as zero, not as a straight line). */
export function timeSeries(rows: Rows, x: string, bucket: 'day' | 'week' | 'month', agg: Agg, field?: string, series?: string, maxSeries = 6): Series[] {
	const byS = new Map<string, Map<string, Rows>>();
	const allB = new Set<string>();
	for (const r of rows) {
		const d = day(get(r, x));
		if (!d) continue;
		const b = bucketOf(d, bucket);
		allB.add(b);
		const s = series ? keyOf(get(r, series)) : '';
		const m = byS.get(s) ?? byS.set(s, new Map()).get(s)!;
		(m.get(b) ?? m.set(b, []).get(b)!).push(r);
	}
	if (!allB.size) return [];
	const sorted = [...allB].sort();
	const buckets: string[] = [];
	for (let b = sorted[0]; b <= sorted[sorted.length - 1] && buckets.length < 1000; b = nextBucket(b, bucket)) buckets.push(b);
	let out = [...byS].map(([key, m]) => ({ key, points: buckets.map((b) => ({ x: b, y: m.has(b) ? aggregate(m.get(b)!, agg, field) : 0 })) }));
	out.sort((a, b) => b.points.reduce((s, p) => s + p.y, 0) - a.points.reduce((s, p) => s + p.y, 0));
	if (out.length > maxSeries) out = out.slice(0, maxSeries); // never generate a 7th hue; extra series are dropped (noted in UI)
	return out;
}

export function sortRows(rows: Rows, sort?: string): Rows {
	if (!sort) return rows;
	const desc = sort.startsWith('-');
	const f = desc ? sort.slice(1) : sort;
	return [...rows].sort((a, b) => {
		const va = get(a, f), vb = get(b, f);
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		const na = num(va), nb = num(vb);
		const c =
			na !== null && nb !== null ? na - nb
			: na !== null ? (desc ? 1 : -1)
			: nb !== null ? (desc ? -1 : 1)
			: String(va).localeCompare(String(vb), undefined, { numeric: true });
		return desc ? -c : c;
	});
}

export function distinctValues(rows: Rows, field: string, limit = 200): string[] {
	const counts = new Map<string, number>();
	for (const r of rows) {
		const raw = get(r, field);
		for (const k of Array.isArray(raw) ? raw.map(keyOf) : [keyOf(raw)]) counts.set(k, (counts.get(k) ?? 0) + 1);
	}
	return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([k]) => k);
}
