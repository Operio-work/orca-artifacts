import { join } from 'node:path';
import { SITE_DIR } from './config';
import { readJson, writeJson } from './json';
import { queueCommit } from './git';
import { getDashboard, SLUG_RE } from './dashboards';
import { DASH_DIR } from './config';

export type Verdict = 'approve' | 'reject';

/** Approve (drop the draft status) or reject (keep the files, stop listing it). Returns false if not a draft. */
export async function review(key: string, verdict: Verdict, user: string): Promise<boolean> {
	const [kind, slug] = key.split(':');
	if (!SLUG_RE.test(slug ?? '')) return false;
	const msg = `${verdict === 'approve' ? 'approve' : 'reject'} ${key} (${user})`;
	if (kind === 'dashboard') {
		const spec = await getDashboard(slug);
		if (!spec || spec.status !== 'draft') return false;
		if (verdict === 'approve') delete spec.status;
		else spec.status = 'rejected';
		await writeJson(join(DASH_DIR, `${slug}.json`), spec);
		queueCommit(`dashboards/${slug}.json`, msg);
		return true;
	}
	if (kind === 'page') {
		const file = join(SITE_DIR, slug, 'meta.json');
		const meta = await readJson<Record<string, unknown> | null>(file, null);
		if (!meta || meta.status !== 'draft') return false;
		if (verdict === 'approve') delete meta.status;
		else meta.status = 'rejected';
		await writeJson(file, meta);
		queueCommit(`site/${slug}/meta.json`, msg);
		return true;
	}
	return false;
}
