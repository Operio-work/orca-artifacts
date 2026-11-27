import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const SHELL = `shell-${version}`; // app code + static files of this build
const PAGES = 'pages'; // last pages, dashboards and data seen (kept across versions)
const MAX_PAGES = 80;
// Paths are relative to the base path ("" here); make them absolute. The service worker itself is skipped.
const SHELL_FILES = [...immutable, ...assets].map((f) => '/' + f.path.replace(/^\//, '')).filter((p) => p !== '/service-worker.js');

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
		const hit = (await caches.match(req)) ?? (req.mode === 'navigate' ? await caches.match('/') : undefined);
		if (hit) return hit;
		return new Response(
			'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title>' +
				'<body style="font-family:system-ui;padding:2rem;color:#3f3f46"><p>Sin conexión y esta página no está guardada.<br>Offline, and this page was not saved yet.</p>',
			{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
		);
	}
}

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;
	if (url.pathname === '/healthz' || url.pathname === '/manifest.webmanifest') return;
	if (SHELL_FILES.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
		return;
	}
	event.respondWith(networkFirst(req));
});
