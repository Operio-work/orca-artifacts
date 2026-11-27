import type { DashboardSpec, Format } from '#lib/types.js';
import { fmtDate, fmtNum, tl, t } from '#lib/i18n.svelte.js';

export function valueLabel(spec: DashboardSpec, field: string, raw: string): string {
	if (raw === '__other__') return t('other');
	const l = spec.labels?.[field]?.[raw];
	return l ? tl(l) : raw;
}

const SAFE_HOST = /^https:\/\/[^\s/]+/;

export interface Cell { text: string; href?: string; pill?: string; num?: boolean }

export function cell(spec: DashboardSpec, field: string, v: unknown, format?: Format): Cell {
	if (v == null || v === '') return { text: '—' };
	if (format === 'link') {
		const s = String(v);
		return SAFE_HOST.test(s) ? { text: s.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''), href: s } : { text: s };
	}
	if (format === 'date') return { text: fmtDate(String(v)) };
	if (format === 'pill') return { text: valueLabel(spec, field, String(v)), pill: String(v).toLowerCase() };
	const n = typeof v === 'number' ? v : format && format !== 'text' ? Number(v) : NaN;
	if (Number.isFinite(n) && (typeof v === 'number' || (format && format !== 'text'))) return { text: fmtNum(n, format), num: true };
	if (Array.isArray(v)) return { text: v.map((x) => valueLabel(spec, field, String(x))).join(', ') };
	if (typeof v === 'object') return { text: JSON.stringify(v) };
	return { text: valueLabel(spec, field, String(v)) };
}

/** Pill tone by common status words (same vocabulary as orca.css). */
export function pillTone(s: string): string {
	if (/^(live|active|ready|done|sent|ok|won|paid|published|posted|keep)/.test(s)) return 'ok';
	if (/^(expired|declined|failed|removed|lost|error|drop|rejected)/.test(s)) return 'bad';
	if (/^(expiring|pending|wait|draft|review|paused|hold)/.test(s)) return 'warn';
	return 'neutral';
}
