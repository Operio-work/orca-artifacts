import type { AlertSpec, DashboardSpec, Rows, StatWidget } from '#lib/types.js';
import { aggregate, matches } from './engine';

export function crosses(v: number, op: AlertSpec['op'], line: number): boolean {
	switch (op) {
		case '<': return v < line;
		case '<=': return v <= line;
		case '>': return v > line;
		case '>=': return v >= line;
		case '=': return v === line;
		case '!=': return v !== line;
	}
}

/** The watched stat's value over all rows (no filters, no range) and whether the alert is on. */
export function checkAlert(spec: DashboardSpec, rows: Record<string, Rows>, a: AlertSpec): { value: number; on: boolean; widget: StatWidget } | null {
	const w = spec.widgets.find((x) => x.id === a.widget);
	if (!w || w.type !== 'stat' || !w.source) return null;
	const value = aggregate((rows[w.source] ?? []).filter((r) => matches(r, w.where)), w.agg, w.field);
	return { value, on: crosses(value, a.op, a.value), widget: w };
}
