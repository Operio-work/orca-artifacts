import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let lib = '';
let publish: typeof import('./publish').publish;
let review: typeof import('./review').review;
let loadCatalog: typeof import('./catalog').loadCatalog;

beforeAll(async () => {
	lib = await mkdtemp(join(tmpdir(), 'oa-lib-'));
	await mkdir(join(lib, 'site'), { recursive: true });
	await mkdir(join(lib, 'dashboards'), { recursive: true });
	process.env.ARTIFACTS_LIBRARY = lib; // config reads it on import
	({ publish } = await import('./publish'));
	({ review } = await import('./review'));
	({ loadCatalog } = await import('./catalog'));
});
afterAll(() => rm(lib, { recursive: true, force: true }));

const spec = (slug: string) => ({
	version: 1,
	slug,
	title: { es: 'Ventas', en: 'Sales' },
	sources: { s: { rows: [{ a: 1 }] } },
	widgets: [{ type: 'stat', source: 's', agg: 'count' }]
});
const status = async (key: string) => (await loadCatalog()).find((i) => i.key === key)?.status ?? null;
const listed = async (key: string) => (await loadCatalog()).some((i) => i.key === key);

describe('publish dashboard', () => {
	it('lands as a draft with who published it', async () => {
		const r = await publish({ kind: 'dashboard', spec: spec('sales'), by: 'Writer agent' });
		expect(r).toMatchObject({ ok: true, key: 'dashboard:sales', status: 'draft' });
		const saved = JSON.parse(await readFile(join(lib, 'dashboards', 'sales.json'), 'utf8'));
		expect(saved).toMatchObject({ status: 'draft', by: 'Writer agent' });
		expect(await status('dashboard:sales')).toBe('draft');
	});
	it('ignores draft:false unless direct publishing is on', async () => {
		const r = await publish({ kind: 'dashboard', spec: spec('sales2'), draft: false });
		expect(r.status).toBe('draft');
	});
	it('rejects bad specs', async () => {
		const r = await publish({ kind: 'dashboard', spec: { ...spec('x'), slug: 'Bad Slug' } });
		expect(r.ok).toBe(false);
	});
	it('approve makes it live; a second approve is refused', async () => {
		expect(await review('dashboard:sales', 'approve', 'ana')).toBe(true);
		expect(await status('dashboard:sales')).toBeNull();
		expect(await listed('dashboard:sales')).toBe(true);
		expect(await review('dashboard:sales', 'approve', 'ana')).toBe(false);
	});
	it('reject stops listing it but keeps the file', async () => {
		expect(await review('dashboard:sales2', 'reject', 'ana')).toBe(true);
		expect(await listed('dashboard:sales2')).toBe(false);
		expect(JSON.parse(await readFile(join(lib, 'dashboards', 'sales2.json'), 'utf8')).status).toBe('rejected');
	});
});

describe('publish page', () => {
	it('needs index.html for a new page', async () => {
		const r = await publish({ kind: 'page', slug: 'report', files: { 'data.json': { text: '{}' } } });
		expect(r.ok).toBe(false);
	});
	it('refuses paths outside the page and odd file types', async () => {
		for (const name of ['../x.html', '/etc/passwd', 'a/../../b.html', 'run.sh', '.env'])
			expect((await publish({ kind: 'page', slug: 'report', files: { 'index.html': { text: 'x' }, [name]: { text: 'x' } } })).ok, name).toBe(false);
	});
	it('writes files and a draft meta.json', async () => {
		const r = await publish({
			kind: 'page',
			slug: 'report',
			by: 'Scheduler',
			files: {
				'index.html': { text: '<!doctype html><title>Report</title>' },
				'meta.json': { text: JSON.stringify({ title: { es: 'Reporte', en: 'Report' }, status: 'live-please' }) },
				'img/logo.png': { base64: Buffer.from('png').toString('base64') }
			}
		});
		expect(r).toMatchObject({ ok: true, key: 'page:report', status: 'draft', url: '/report/' });
		const meta = JSON.parse(await readFile(join(lib, 'site', 'report', 'meta.json'), 'utf8'));
		expect(meta).toMatchObject({ status: 'draft', by: 'Scheduler', title: { en: 'Report' } });
		expect(await readFile(join(lib, 'site', 'report', 'img', 'logo.png'), 'utf8')).toBe('png');
		expect(await status('page:report')).toBe('draft');
		expect(await review('page:report', 'approve', 'ana')).toBe(true);
		expect(await status('page:report')).toBeNull();
	});
});

describe('publish data', () => {
	it('writes dashboard data straight away', async () => {
		const r = await publish({ kind: 'data', name: 'sales', json: { items: [{ a: 1 }] } });
		expect(r).toMatchObject({ ok: true, status: 'live' });
		expect(JSON.parse(await readFile(join(lib, 'dashboards', 'data', 'sales.json'), 'utf8')).items).toHaveLength(1);
	});
	it('writes a page data.json only for an existing page', async () => {
		expect((await publish({ kind: 'data', page: 'nope', json: { items: [] } })).ok).toBe(false);
		expect((await publish({ kind: 'data', page: 'report', json: { items: [] } })).ok).toBe(true);
	});
	it('refuses bad names', async () => {
		expect((await publish({ kind: 'data', name: '../x', json: {} })).ok).toBe(false);
		expect((await publish({ kind: 'other' })).ok).toBe(false);
	});
});
