import { describe, expect, it } from 'vitest';
import type { DashboardSpec } from '#lib/types.js';
import { checkAlert, crosses } from './alerts';
import { validateSpec } from './validate';

const spec = (alerts: unknown): DashboardSpec =>
	({
		version: 1,
		slug: 'leads',
		title: { es: 'Prospectos', en: 'Leads' },
		sources: { l: { rows: [] } },
		widgets: [
			{ id: 'today', type: 'stat', source: 'l', agg: 'count', where: { status: 'new' } },
			{ id: 'chart', type: 'bar', source: 'l', groupBy: 'status', agg: 'count' }
		],
		alerts
	}) as DashboardSpec;

describe('dashboard alerts', () => {
	it('compares', () => {
		expect(crosses(4, '<', 5)).toBe(true);
		expect(crosses(5, '<', 5)).toBe(false);
		expect(crosses(5, '<=', 5)).toBe(true);
		expect(crosses(6, '>', 5)).toBe(true);
		expect(crosses(5, '=', 5)).toBe(true);
		expect(crosses(5, '!=', 5)).toBe(false);
	});
	it('reads the watched stat with its where', () => {
		const s = spec([{ widget: 'today', op: '<', value: 3 }]);
		const rows = { l: [{ status: 'new' }, { status: 'new' }, { status: 'won' }] };
		expect(checkAlert(s, rows, s.alerts![0])).toMatchObject({ value: 2, on: true });
		expect(checkAlert(s, { l: [...rows.l, { status: 'new' }] }, s.alerts![0])).toMatchObject({ value: 3, on: false });
	});
	it('validates', () => {
		expect(validateSpec(spec([{ widget: 'today', op: '<', value: 5 }]))).toEqual([]);
		const bad = validateSpec(spec([{ widget: 'chart', op: '~', value: 'x' }, { widget: 'nope', op: '>', value: 1 }]));
		expect(bad.join('\n')).toMatch(/is a bar/);
		expect(bad.join('\n')).toMatch(/op must be/);
		expect(bad.join('\n')).toMatch(/value must be a number/);
		expect(bad.join('\n')).toMatch(/alert 2: widget must be the id/);
	});
});
