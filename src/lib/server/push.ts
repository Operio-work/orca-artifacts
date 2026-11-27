// Push alerts to phones and desktops (Web Push, VAPID). Subscriptions live in var/push.json,
// keys in env (ARTIFACTS_VAPID_PUBLIC_KEY / ARTIFACTS_VAPID_PRIVATE_KEY) or var/vapid.json,
// made on first use with mode 600. var/ stays out of git.
import { join } from 'node:path';
import { chmod } from 'node:fs/promises';
import webpush from 'web-push';
import type { L10n, Lang } from '#lib/types.js';
import { BASE } from '#lib/base.js';
import { VAPID_SUBJECT, VAR_DIR } from './config';
import { readJson, writeJson } from './json';

const SUBS = join(VAR_DIR, 'push.json');
const KEYS = join(VAR_DIR, 'vapid.json');
const MAX_SUBS = 500;

export interface Sub {
	endpoint: string;
	keys: { p256dh: string; auth: string };
	user: string;
	lang: Lang;
	edit: boolean; // may approve: gets "new draft" alerts
	at: string;
}

export interface Alert {
	title: L10n;
	body: L10n;
	url: string; // path inside the app, e.g. /d/sales
	tag?: string; // same tag replaces the previous notification
}

let keys: Promise<{ publicKey: string; privateKey: string }> | null = null;
export function vapidKeys() {
	keys ??= (async () => {
		const env = { publicKey: process.env.ARTIFACTS_VAPID_PUBLIC_KEY ?? '', privateKey: process.env.ARTIFACTS_VAPID_PRIVATE_KEY ?? '' };
		let k = env.publicKey && env.privateKey ? env : await readJson<{ publicKey?: string; privateKey?: string }>(KEYS, {});
		if (!k.publicKey || !k.privateKey) {
			k = webpush.generateVAPIDKeys();
			await writeJson(KEYS, k);
			await chmod(KEYS, 0o600);
		}
		webpush.setVapidDetails(VAPID_SUBJECT, k.publicKey!, k.privateKey!);
		return k as { publicKey: string; privateKey: string };
	})();
	return keys;
}

let lock: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
	const next = lock.then(fn, fn);
	lock = next.catch(() => {});
	return next;
}
const readSubs = () => readJson<Sub[]>(SUBS, []);

/** A browser's subscription as it arrives from pushManager.subscribe(); null if it isn't one. */
export function cleanSub(raw: unknown): Pick<Sub, 'endpoint' | 'keys'> | null {
	const s = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
	if (!s || typeof s.endpoint !== 'string' || !/^https:\/\/\S{1,1000}$/.test(s.endpoint)) return null;
	const { p256dh, auth } = s.keys ?? {};
	if (typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100) return null;
	return { endpoint: s.endpoint, keys: { p256dh, auth } };
}

export const subscribe = (s: Omit<Sub, 'at'>) =>
	locked(async () => {
		const subs = (await readSubs()).filter((x) => x.endpoint !== s.endpoint);
		subs.push({ ...s, at: new Date().toISOString() });
		await writeJson(SUBS, subs.slice(-MAX_SUBS));
	});

export const unsubscribe = (endpoint: string) =>
	locked(async () => {
		const subs = await readSubs();
		const left = subs.filter((x) => x.endpoint !== endpoint);
		if (left.length !== subs.length) await writeJson(SUBS, left);
	});

export async function isSubscribed(endpoint: string) {
	return (await readSubs()).some((x) => x.endpoint === endpoint);
}

/** Send to every subscription that passes `who`. Gone subscriptions (404/410) are dropped. */
export async function notify(alert: Alert, who: (s: Sub) => boolean = () => true): Promise<number> {
	const subs = (await readSubs()).filter(who);
	if (!subs.length) return 0;
	await vapidKeys();
	const gone: string[] = [];
	let sent = 0;
	await Promise.all(
		subs.map(async (s) => {
			const payload = JSON.stringify({ title: alert.title[s.lang], body: alert.body[s.lang], url: BASE + alert.url, tag: alert.tag });
			try {
				await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 24 * 3600, urgency: 'normal' });
				sent++;
			} catch (e) {
				const code = (e as { statusCode?: number }).statusCode;
				if (code === 404 || code === 410) gone.push(s.endpoint);
				else console.error('[push]', code ?? '', (e as Error).message);
			}
		})
	);
	for (const g of gone) await unsubscribe(g);
	return sent;
}

/** "New draft to approve", to everyone who may approve except the one who made it. */
export function notifyDraft(kind: 'page' | 'dashboard', slug: string, title: string, by: string) {
	const what = { es: kind === 'dashboard' ? 'Tablero' : 'Página', en: kind === 'dashboard' ? 'Dashboard' : 'Page' };
	return notify(
		{
			title: { es: 'Nuevo para aprobar', en: 'New to approve' },
			body: { es: `${what.es} «${title}» de ${by}`, en: `${what.en} “${title}” from ${by}` },
			url: kind === 'dashboard' ? `/d/${slug}` : '/?drafts=1',
			tag: `draft:${kind}:${slug}`
		},
		(s) => s.edit && s.user !== by
	).catch((e) => (console.error('[push] draft:', (e as Error).message), 0));
}
