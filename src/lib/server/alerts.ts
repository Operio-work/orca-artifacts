// Dashboard alerts: each approved dashboard's `alerts` are checked every ARTIFACTS_ALERT_MINUTES
// (default 10) and right after data arrives through /api/publish. An alert pushes once when it
// turns on, and again only after it has been off. State: var/alerts.json.
import { join } from 'node:path';
import { checkAlert } from '#lib/dash/alerts.js';
import { VAR_DIR } from './config';
import { listDashboards, resolveAll } from './dashboards';
import { readJson, writeJson } from './json';
import { notify } from './push';

const STATE = join(VAR_DIR, 'alerts.json');
const minutes = Math.max(1, Number(process.env.ARTIFACTS_ALERT_MINUTES) || 10);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

let running: Promise<number> | null = null;

/** Check every alert; returns how many turned on. */
export function checkAlerts(): Promise<number> {
	running ??= run().finally(() => (running = null));
	return running;
}

async function run(): Promise<number> {
	const state = await readJson<Record<string, boolean>>(STATE, {});
	const next: Record<string, boolean> = {};
	let fired = 0;
	for (const spec of await listDashboards()) {
		if (spec.status || !spec.alerts?.length) continue;
		const data = await resolveAll(spec);
		const rows = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.rows]));
		for (const [i, a] of spec.alerts.entries()) {
			const r = checkAlert(spec, rows, a);
			if (!r) continue;
			const key = `${spec.slug}#${i}:${a.widget}${a.op}${a.value}`;
			next[key] = r.on;
			if (!r.on || state[key]) continue;
			fired++;
			const wt = r.widget.title ?? spec.title;
			await notify({
				title: spec.title,
				body: a.message ?? { es: `${wt.es}: ${fmt(r.value)}`, en: `${wt.en}: ${fmt(r.value)}` },
				url: `/d/${spec.slug}`,
				tag: `alert:${key}`
			});
		}
	}
	await writeJson(STATE, next);
	return fired;
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startAlerts() {
	if (timer || process.env.VITEST) return;
	timer = setInterval(() => void checkAlerts().catch((e) => console.error('[alerts]', (e as Error).message)), minutes * 60_000);
	timer.unref();
	setTimeout(() => void checkAlerts().catch((e) => console.error('[alerts]', (e as Error).message)), 15_000).unref();
}
