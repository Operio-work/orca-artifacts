import type { RequestHandler } from './$types';
import { BRAND } from '#lib/server/config.js';

/** Web app manifest; name follows the library's branding. */
export const GET: RequestHandler = ({ locals }) => {
	const name = BRAND.org ? `${BRAND.name} · ${BRAND.org}` : BRAND.name;
	const es = locals.lang === 'es';
	const body = {
		id: '/',
		name,
		short_name: BRAND.name.length > 12 ? 'Artifacts' : BRAND.name,
		description: es ? 'Tus páginas vivas y tableros, en un solo lugar.' : 'Your live pages and dashboards in one place.',
		lang: locals.lang,
		start_url: '/',
		scope: '/',
		display: 'standalone',
		background_color: '#f4f4f5',
		theme_color: '#f4f4f5',
		icons: [
			{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
			{ src: '/icons/orca-artifacts.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
		],
		shortcuts: [
			{ name: es ? 'Fijados' : 'Pinned', url: '/?pinned=1' },
			{ name: es ? 'Tableros' : 'Dashboards', url: '/?kind=dashboard' }
		]
	};
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-cache' }
	});
};
