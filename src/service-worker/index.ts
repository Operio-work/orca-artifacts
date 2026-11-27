import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const SHELL = `shell-${version}`; // app code + static files of this build
const PAGES = 'pages'; // last pages, dashboards and data seen (kept across versions)
const MAX_PAGES = 80;
const SHARE = 'share'; // what was just shared to the app, until the /share page picks it up
// The app's base path ("" or e.g. "/c/acme/artifacts"): the service worker's own folder.
const BASE = new URL(sw.registration.scope).pathname.replace(/\/$/, '');
// Paths are relative to the base path; make them absolute. The service worker itself is skipped.
const SHELL_FILES = [...immutable, ...assets].map((f) => BASE + '/' + f.path.replace(/^\//, '')).filter((p) => p !== BASE + '/service-worker.js');

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== PAGES).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

async function trim() {
	const c = await caches.open(PAGES);
	const keys = await c.keys();
	for (const k of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) await c.delete(k);
}

/** Network first; on success remember it, offline fall back to the last copy. */
async function networkFirst(req: Request): Promise<Response> {
	try {
		const res = await fetch(req);
		if (res.ok && res.type === 'basic') {
			const c = await caches.open(PAGES);
			await c.delete(req); // re-insert so the newest are kept by trim()
			await c.put(req, res.clone());
			trim();
		}
		return res;
	} catch {
		const hit = (await caches.match(req)) ?? (req.mode === 'navigate' ? await caches.match(BASE + '/') : undefined);
		if (hit) return hit;
		return new Response(
			'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title>' +
				'<body style="font-family:system-ui;padding:2rem;color:#3f3f46"><p>Sin conexión y esta página no está guardada.<br>Offline, and this page was not saved yet.</p>',
			{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
		);
	}
}

/** Share sheet → keep the parts in a cache, then open /share to review and save them. */
async function receiveShare(req: Request): Promise<Response> {
	const form = await req.formData();
	const c = await caches.open(SHARE);
	const meta = { title: String(form.get('title') ?? ''), text: String(form.get('text') ?? ''), url: String(form.get('url') ?? ''), file: null as null | { name: string; type: string } };
	const file = form.get('file');
	if (file instanceof File && file.size) {
		meta.file = { name: file.name, type: file.type };
		await c.put(BASE + '/share/file', new Response(file, { headers: { 'content-type': file.type || 'application/octet-stream' } }));
	} else await c.delete(BASE + '/share/file');
	await c.put(BASE + '/share/meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
	return Response.redirect(BASE + '/share?received=1', 303);
}

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;
	if (req.method === 'POST' && url.pathname === BASE + '/share') {
		event.respondWith(receiveShare(req));
		return;
	}
	if (req.method !== 'GET') return;
	if (url.pathname === BASE + '/healthz' || url.pathname === BASE + '/manifest.webmanifest' || url.pathname.startsWith(BASE + '/auth/')) return;
	if (SHELL_FILES.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
		return;
	}
	event.respondWith(networkFirst(req));
});

// ---------- Push alerts ----------
sw.addEventListener('push', (event) => {
	let m: { title?: string; body?: string; url?: string; tag?: string } = {};
	try {
		m = event.data?.json() ?? {};
	} catch {
		m = { body: event.data?.text() };
	}
	event.waitUntil(
		sw.registration.showNotification(m.title || 'ORCA Artifacts', {
			body: m.body ?? '',
			tag: m.tag,
			icon: BASE + '/icons/icon-192.png',
			badge: BASE + '/icons/icon-192.png',
			data: { url: m.url || BASE + '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const raw = String(event.notification.data?.url ?? BASE + '/');
	const target = new URL(raw, sw.location.origin);
	const url = target.origin === sw.location.origin ? target.href : sw.location.origin + BASE + '/';
	event.waitUntil(
		(async () => {
			const open = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const same = open.find((c) => c.url === url) ?? open[0];
			if (same) {
				await same.focus();
				if (same.url !== url && 'navigate' in same) await (same as WindowClient).navigate(url).catch(() => {});
				return;
			}
			await sw.clients.openWindow(url);
		})()
	);
});
