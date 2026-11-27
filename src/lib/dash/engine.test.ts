import { describe, expect, it } from 'vitest';
import { aggregate, groupBy, matches, timeSeries, sortRows, bucketOf } from './engine';
import { validateSpec } from './validate';
import { tz } from '#lib/tz.js';

tz.zone = 'America/Bogota'; // the day-boundary cases below are written for UTC−5

const rows = [
	{ city: 'Porto', members: 10, status: 'active', date: '2026-11-01' },
	{ city: 'Lisbon', members: 30, status: 'active', date: '2026-11-03' },
	{ city: 'Porto', members: 5, status: 'paused', date: '2026-11-10' },
	{ city: null, members: 'x', status: 'active', date: '2026-11-10T03:00:00Z' }
];

describe('engine', () => {
	it('aggregates', () => {
		expect(aggregate(rows, 'count')).toBe(4);
		expect(aggregate(rows, 'sum', 'members')).toBe(45);
		expect(aggregate(rows, 'avg', 'members')).toBe(15);
		expect(aggregate(rows, 'distinct', 'city')).toBe(3);
	});
	it('matches where', () => {
		expect(rows.filter((r) => matches(r, { status: 'active' })).length).toBe(3);
		expect(rows.filter((r) => matches(r, { members: { gte: 10 } })).length).toBe(2);
		expect(rows.filter((r) => matches(r, { city: ['Porto', '—'] })).length).toBe(3);
		expect(rows.filter((r) => matches(r, { status: { not: 'paused' } })).length).toBe(3);
	});
	it('groups with Other', () => {
		const g = groupBy(rows, 'city', 'count', undefined, 2);
		expect(g[0]).toEqual({ key: 'Porto', value: 2 });
		expect(g[1].key).toBe('__other__');
		expect(g[1].value).toBe(2);
	});
	it('fills empty buckets; ISO times use the library time zone', () => {
		const s = timeSeries(rows, 'date', 'day', 'count');
		expect(s[0].points.length).toBe(10); // Nov 1..9 (03:00Z on the 10th is the 9th at UTC−5)
		expect(s[0].points.at(-1)).toEqual({ x: '2026-11-10', y: 1 });
		expect(bucketOf('2026-11-19', 'week')).toBe('2026-11-16');
	});
	it('sorts', () => {
		expect(sortRows(rows, '-members')[0].members).toBe(30);
	});
	it('validates specs', () => {
		expect(validateSpec({ version: 1, slug: 'ok', title: { es: 'a', en: 'b' }, sources: { s: { rows: [] } }, widgets: [{ type: 'stat', source: 's', agg: 'count' }] })).toEqual([]);
		expect(validateSpec({ version: 1, slug: 'Bad', title: { es: 'a' }, sources: {}, widgets: [{ type: 'pie' }] }).length).toBeGreaterThan(2);
	});
});
