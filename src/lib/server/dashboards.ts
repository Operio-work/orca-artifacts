import { readdir, unlink, readFile, stat } from 'node:fs/promises';
import { join, resolve, sep, relative } from 'node:path';
import type { DashboardSpec, Rows, SourceSpec } from '#lib/types.js';
import { DASH_DIR, DASH_DATA_DIR, REPO_DIR, SITE_DIR } from './config';
import { readJson, writeJson } from './json';
import { queueCommit } from './git';
import { validateSpec } from '#lib/dash/validate.js';

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,59}$/;
const MAX_ROWS = 20_000;

export async function listDashboards(): Promise<DashboardSpec[]> {
	let names: string[] = [];
	try {
		names = (await readdir(DASH_DIR)).filter((n) => n.endsWith('.json'));
	} catch {
		return [];
	}
	const out: DashboardSpec[] = [];
	for (const n of names) {
		const s = await readJson<DashboardSpec | null>(join(DASH_DIR, n), null);
		if (s && s.slug === n.slice(0, -5) && !validateSpec(s).length) {
			s.updated ??= (await stat(join(DASH_DIR, n))).mtime.toISOString();
			out.push(s);
		}
		else console.warn(`[dashboards] skipped invalid ${n}`);
	}
	return out;
}

export async function getDashboard(slug: string): Promise<DashboardSpec | null> {
	if (!SLUG_RE.test(slug)) return null;
	return readJson<DashboardSpec | null>(join(DASH_DIR, `${slug}.json`), null);
}

export async function saveDashboard(spec: DashboardSpec, previousSlug?: string) {
	spec.updated = new Date().toISOString();
	await writeJson(join(DASH_DIR, `${spec.slug}.json`), spec);
	queueCommit(`dashboards/${spec.slug}.json`, `dashboard ${spec.slug}`);
	if (previousSlug && previousSlug !== spec.slug && SLUG_RE.test(previousSlug)) {
		await deleteDashboard(previousSlug);
	}
}

export async function deleteDashboard(slug: string) {
	if (!SLUG_RE.test(slug)) return;
	await unlink(join(DASH_DIR, `${slug}.json`)).catch(() => {});
	queueCommit(`dashboards/${slug}.json`, `remove dashboard ${slug}`);
}

/** Only JSON under site/ or dashboards/data/ may be read as a data source. */
export function safeDataFile(file: string): string | null {
	if (!file.endsWith('.json')) return null;
	const abs = resolve(REPO_DIR, file);
	for (const root of [SITE_DIR, DASH_DATA_DIR]) {
		if (abs.startsWith(root + sep)) return abs;
	}
	return null;
}

export function pick(obj: unknown, path?: string): unknown {
	if (!path) return obj;
	return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export async function resolveSource(src: SourceSpec): Promise<{ rows: Rows; updated?: string; error?: string }> {
	if (Array.isArray(src.rows)) return { rows: src.rows.slice(0, MAX_ROWS) };
	if (!src.file) return { rows: [], error: 'no file' };
	const abs = safeDataFile(src.file);
	if (!abs) return { rows: [], error: `not allowed: ${src.file}` };
	let doc: unknown;
	try {
		doc = JSON.parse(await readFile(abs, 'utf8'));
	} catch {
		return { rows: [], error: `cannot read ${src.file}` };
	}
	const arr = pick(doc, src.path);
	if (!Array.isArray(arr)) return { rows: [], error: `${src.path ?? '(root)'} is not a list` };
	const updated = (doc as { updated?: string })?.updated;
	return { rows: arr.filter((r) => r && typeof r === 'object').slice(0, MAX_ROWS) as Rows, updated };
}

export async function resolveAll(spec: DashboardSpec) {
	const out: Record<string, { rows: Rows; updated?: string; error?: string }> = {};
	await Promise.all(Object.entries(spec.sources).map(async ([k, s]) => (out[k] = await resolveSource(s))));
	return out;
}

/** Every JSON file a dashboard may use, with the lists inside it and their fields. */
export async function listDataFiles() {
	const files: string[] = [];
	async function walk(dir: string, depth: number) {
		if (depth > 4) return;
		let ents;
		try {
			ents = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of ents) {
			const p = join(dir, e.name);
			if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'assets') await walk(p, depth + 1);
			else if (e.isFile() && e.name.endsWith('.json') && e.name !== 'meta.json') files.push(p);
		}
	}
	await walk(SITE_DIR, 0);
	await walk(DASH_DATA_DIR, 0);
	const out: { file: string; lists: { path: string; count: number; fields: string[] }[] }[] = [];
	for (const abs of files) {
		const doc = await readJson<unknown>(abs, null);
		const lists: { path: string; count: number; fields: string[] }[] = [];
		const scan = (v: unknown, path: string, depth: number) => {
			if (Array.isArray(v)) {
				const objs = v.filter((r) => r && typeof r === 'object' && !Array.isArray(r)) as Rows;
				if (objs.length) {
					const fields = new Set<string>();
					for (const r of objs.slice(0, 50)) for (const k of Object.keys(r)) fields.add(k);
					lists.push({ path, count: objs.length, fields: [...fields] });
				}
			} else if (v && typeof v === 'object' && depth < 2) {
				for (const [k, c] of Object.entries(v)) scan(c, path ? `${path}.${k}` : k, depth + 1);
			}
		};
		scan(doc, '', 0);
		if (lists.length) out.push({ file: relative(REPO_DIR, abs), lists });
	}
	return out.sort((a, b) => a.file.localeCompare(b.file));
}
