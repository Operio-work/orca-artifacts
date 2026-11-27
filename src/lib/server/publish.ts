import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { DashboardSpec } from '#lib/types.js';
import { validateSpec } from '#lib/dash/validate.js';
import { DASH_DATA_DIR, DASH_DIR, PUBLISH_DIRECT, RESERVED, SITE_DIR } from './config';
import { readJson, writeJson } from './json';
import { queueCommit } from './git';
import { SLUG_RE } from './dashboards';
import { notifyDraft } from './push';
import { checkAlerts } from './alerts';

export const LIMITS = { files: 40, bytes: 5 * 1024 * 1024 };
const FILE_RE = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*){0,3}$/;
const EXT = /\.(html|css|js|mjs|json|svg|png|jpe?g|webp|gif|txt|md|pdf|woff2)$/i;
const DATA_NAME = /^[a-z0-9][a-z0-9_-]{0,59}$/;

export interface PublishResult {
	ok: boolean;
	problems?: string[];
	key?: string;
	status?: 'draft' | 'live';
	url?: string;
}

type FileIn = { text?: string; base64?: string };
const fail = (...problems: string[]): PublishResult => ({ ok: false, problems });
const by = (v: unknown) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) : '') || 'publisher';

/** Body: { kind: 'page' | 'dashboard' | 'data', … } — see docs/publishing.md. */
export async function publish(b: Record<string, unknown>): Promise<PublishResult> {
	const draft = !(PUBLISH_DIRECT && b.draft === false);
	switch (b.kind) {
		case 'dashboard':
			return publishDashboard(b, draft);
		case 'page':
			return publishPage(b, draft);
		case 'data':
			return publishData(b);
	}
	return fail('kind: page, dashboard or data');
}

async function publishDashboard(b: Record<string, unknown>, draft: boolean): Promise<PublishResult> {
	const spec = b.spec as DashboardSpec;
	if (!spec || typeof spec !== 'object') return fail('spec required');
	const problems = validateSpec(spec);
	if (RESERVED.has(spec.slug)) problems.push('slug is reserved');
	if (problems.length) return fail(...problems);
	if (draft) spec.status = 'draft';
	else delete spec.status;
	spec.by = by(b.by);
	spec.updated = new Date().toISOString();
	await writeJson(join(DASH_DIR, `${spec.slug}.json`), spec);
	queueCommit(`dashboards/${spec.slug}.json`, `publish dashboard ${spec.slug} (${spec.by}${draft ? ', draft' : ''})`);
	if (draft) void notifyDraft('dashboard', spec.slug, spec.title.en || spec.slug, spec.by);
	return { ok: true, key: `dashboard:${spec.slug}`, status: draft ? 'draft' : 'live', url: `/d/${spec.slug}` };
}

export async function publishPage(b: Record<string, unknown>, draft: boolean): Promise<PublishResult> {
	const slug = String(b.slug ?? '');
	if (!SLUG_RE.test(slug)) return fail('slug: 2–60 lowercase letters, digits, dashes');
	if (RESERVED.has(slug)) return fail('slug is reserved');
	const files = (b.files ?? {}) as Record<string, FileIn>;
	const names = Object.keys(files);
	if (!names.length) return fail('files required');
	if (names.length > LIMITS.files) return fail(`at most ${LIMITS.files} files`);
	const dir = join(SITE_DIR, slug);
	const exists = !!(await stat(join(dir, 'index.html')).catch(() => null));
	if (!exists && !names.includes('index.html')) return fail('a new page needs index.html');

	const out: Array<[string, Buffer]> = [];
	let total = 0;
	for (const name of names) {
		if (!FILE_RE.test(name) || !EXT.test(name)) return fail(`file name not allowed: ${name}`);
		const abs = resolve(dir, name);
		if (!abs.startsWith(dir + sep)) return fail(`file name not allowed: ${name}`);
		const f = files[name];
		const buf = typeof f?.text === 'string' ? Buffer.from(f.text, 'utf8') : typeof f?.base64 === 'string' ? Buffer.from(f.base64, 'base64') : null;
		if (!buf) return fail(`${name}: give text or base64`);
		total += buf.length;
		if (total > LIMITS.bytes) return fail('files are over 5 MB in total');
		out.push([abs, buf]);
	}

	// meta.json: the uploaded one (if any) merged over what is there, then status + by from the server.
	let meta = await readJson<Record<string, unknown>>(join(dir, 'meta.json'), {});
	const up = out.find(([abs]) => abs === join(dir, 'meta.json'));
	if (up) {
		try {
			meta = { ...meta, ...JSON.parse(up[1].toString('utf8')) };
		} catch {
			return fail('meta.json is not valid JSON');
		}
	}
	if (draft) meta.status = 'draft';
	else delete meta.status;
	meta.by = by(b.by);

	for (const [abs, buf] of out) {
		if (abs === join(dir, 'meta.json')) continue;
		await mkdir(dirname(abs), { recursive: true });
		await writeFile(abs, buf);
	}
	await writeJson(join(dir, 'meta.json'), meta);
	queueCommit(`site/${slug}`, `publish page ${slug} (${meta.by}${draft ? ', draft' : ''})`);
	const title = (meta.title as { en?: string } | undefined)?.en || slug;
	if (draft) void notifyDraft('page', slug, title, String(meta.by));
	return { ok: true, key: `page:${slug}`, status: draft ? 'draft' : 'live', url: `/${slug}/` };
}

/** New data for something already approved goes straight through: numbers, not new pages. */
async function publishData(b: Record<string, unknown>): Promise<PublishResult> {
	const body = b.json;
	if (!body || typeof body !== 'object') return fail('json required (an object, e.g. { "items": [...] })');
	const text = JSON.stringify(body, null, 1);
	if (text.length > LIMITS.bytes) return fail('data is over 5 MB');
	if (typeof b.page === 'string') {
		if (!SLUG_RE.test(b.page)) return fail('page: a page slug');
		if (!(await stat(join(SITE_DIR, b.page, 'index.html')).catch(() => null))) return fail(`no page "${b.page}"`);
		await writeFile(join(SITE_DIR, b.page, 'data.json'), text + '\n');
		queueCommit(`site/${b.page}/data.json`, `data ${b.page} (${by(b.by)})`);
		void checkAlerts().catch(() => {});
		return { ok: true, key: `page:${b.page}`, status: 'live', url: `/${b.page}/` };
	}
	const name = String(b.name ?? '');
	if (!DATA_NAME.test(name)) return fail('name: lowercase letters, digits, - or _ (the file dashboards/data/<name>.json)');
	await mkdir(DASH_DATA_DIR, { recursive: true });
	await writeFile(join(DASH_DATA_DIR, `${name}.json`), text + '\n');
	queueCommit(`dashboards/data/${name}.json`, `data ${name} (${by(b.by)})`);
	void checkAlerts().catch(() => {});
	return { ok: true, status: 'live' };
}
