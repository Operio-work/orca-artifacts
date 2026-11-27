// Something shared to the installed app (Android share sheet → service worker → /share page →
// POST /api/share) becomes a draft page: a link or text → a short note page; an image or PDF →
// a page that shows it; an .html file → that page as it is.
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_DIR, RESERVED } from './config';
import { publishPage, type PublishResult } from './publish';

export interface ShareIn {
	title?: string;
	text?: string;
	url?: string;
	file?: { name?: string; type?: string; base64?: string } | null;
}

type Files = Record<string, { text?: string; base64?: string }>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, n) : '');
const IMG: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

export function slugify(s: string) {
	return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
}

/** A link worth showing: http(s) only. A URL inside the shared text counts too (many apps put it there). */
export function sharedUrl(i: ShareIn): string {
	const direct = clip(i.url, 2000);
	if (/^https?:\/\/\S+$/.test(direct)) return direct;
	return /https?:\/\/[^\s<>"']+/.exec(clip(i.text, 4000))?.[0] ?? '';
}

function page(title: string, body: string, date: string) {
	return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#27272a;background:#fafafa;margin:0;line-height:1.55}
main{max-width:46rem;margin:0 auto;padding:2rem 1.25rem 4rem}
h1{font-size:1.5rem;line-height:1.25;margin:0 0 .25rem}
.meta{color:#71717a;font-size:.85rem;margin:0 0 1.5rem}
p{white-space:pre-wrap;overflow-wrap:anywhere}
a{color:#0f766e;overflow-wrap:anywhere}
img,embed{max-width:100%;border-radius:.5rem;border:1px solid #e4e4e7}
embed{width:100%;height:80vh}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;border:1px solid #e4e4e7;border-radius:.5rem;padding:1rem}
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p class="meta">Compartido · Shared · ${esc(date)}</p>
${body}
</main>
</body>
</html>
`;
}

/** The files of the draft page, and a slug stem. Throws Error(message) on something it can't take. */
export function buildShare(i: ShareIn, now = new Date()): { stem: string; title: string; files: Files } {
	const url = sharedUrl(i);
	const text = clip(i.text, 20000);
	const f = i.file && typeof i.file.base64 === 'string' && i.file.base64 ? i.file : null;
	const fname = clip(f?.name, 120);
	let title = clip(i.title, 120) || fname.replace(/\.[^.]+$/, '') || (url ? new URL(url).hostname.replace(/^www\./, '') : '') || text.split('\n')[0].slice(0, 80) || 'Shared';
	const date = now.toISOString().slice(0, 10);
	const desc = clip(text || url || fname, 160);
	const files: Files = {};
	const parts: string[] = [];
	if (text && text !== url) parts.push(`<p>${esc(text)}</p>`);
	if (url) parts.push(`<p><a href="${esc(url)}" rel="noopener noreferrer">${esc(url)}</a></p>`);

	if (f) {
		const type = clip(f.type, 100).toLowerCase();
		const ext = /\.([a-z0-9]+)$/i.exec(fname)?.[1]?.toLowerCase() ?? '';
		if (type === 'text/html' || ext === 'html' || ext === 'htm') {
			files['index.html'] = { text: Buffer.from(f.base64!, 'base64').toString('utf8') };
		} else if (IMG[type]) {
			const name = `image.${IMG[type]}`;
			files[name] = { base64: f.base64 };
			parts.unshift(`<p><img src="${name}" alt="${esc(title)}"></p>`);
		} else if (type === 'application/pdf' || ext === 'pdf') {
			files['file.pdf'] = { base64: f.base64 };
			parts.unshift(`<embed src="file.pdf" type="application/pdf"><p><a href="file.pdf">PDF</a></p>`);
		} else if (type.startsWith('text/') || ext === 'txt' || ext === 'md') {
			parts.push(`<pre>${esc(Buffer.from(f.base64!, 'base64').toString('utf8').slice(0, 200000))}</pre>`);
		} else {
			throw new Error('file type not supported (images, PDF, HTML or text)');
		}
	}
	if (!files['index.html']) {
		if (!parts.length) throw new Error('nothing to save');
		files['index.html'] = { text: page(title, parts.join('\n'), date) };
	}
	title = title || 'Shared';
	files['meta.json'] = { text: JSON.stringify({ title: { es: title, en: title }, description: { es: desc, en: desc }, tags: ['shared'], updated: date }) };
	return { stem: slugify(title) || 'shared', title, files };
}

/** Save it as a draft page under a free slug. */
export async function saveShare(i: ShareIn, by: string): Promise<PublishResult> {
	let built;
	try {
		built = buildShare(i);
	} catch (e) {
		return { ok: false, problems: [(e as Error).message] };
	}
	let slug = built.stem.length >= 2 && !RESERVED.has(built.stem) ? built.stem : `shared-${built.stem}`.slice(0, 50);
	for (let n = 2; await stat(join(SITE_DIR, slug)).catch(() => null); n++) slug = `${built.stem.slice(0, 50)}-${n}`;
	return publishPage({ slug, by, files: built.files }, true);
}
