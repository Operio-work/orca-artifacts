import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { SITE_DIR } from './config';
import { BASE } from '#lib/base.js';

/** Under a base path, a page's root-relative links (/assets/x.css, /other-page/) gain the base. */
export function rebase(text: string, kind: 'html' | 'css', base = BASE): string {
	if (!base) return text;
	const css = (s: string) => s.replace(/url\(\s*(["']?)\/(?!\/)/g, `url($1${base}/`);
	if (kind === 'css') return css(text);
	return css(text.replace(/\b(href|src|action|poster|data-src)=(["'])\/(?!\/)/g, `$1=$2${base}/`));
}

const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.pdf': 'application/pdf',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.md': 'text/plain; charset=utf-8'
};

/** Serve a file from site/ as a plain static file server would. null = not found. */
export async function serveSite(pathname: string): Promise<Response | null> {
	let rel: string;
	try {
		rel = decodeURIComponent(pathname);
	} catch {
		return null;
	}
	if (rel.includes('\0')) return null;
	let abs = resolve(SITE_DIR, '.' + rel);
	if (abs !== SITE_DIR && !abs.startsWith(SITE_DIR + sep)) return null;
	let st = await stat(abs).catch(() => null);
	if (st?.isDirectory()) {
		if (!pathname.endsWith('/')) return new Response(null, { status: 301, headers: { location: BASE + pathname + '/' } });
		abs = join(abs, 'index.html');
		st = await stat(abs).catch(() => null);
	}
	if (!st?.isFile()) return null;
	const type = TYPES[extname(abs).toLowerCase()] ?? 'application/octet-stream';
	const head = {
		'content-type': type,
		'cache-control': type.startsWith('text/html') || type.startsWith('application/json') ? 'no-cache' : 'public, max-age=300',
		'last-modified': st.mtime.toUTCString()
	};
	const kind = type.startsWith('text/html') ? 'html' : type.startsWith('text/css') ? 'css' : null;
	if (BASE && kind) return new Response(rebase(await readFile(abs, 'utf8'), kind), { headers: head });
	const body = Readable.toWeb(createReadStream(abs)) as ReadableStream;
	return new Response(body, {
		headers: {
			'content-type': type,
			'content-length': String(st.size),
			'cache-control': type.startsWith('text/html') || type.startsWith('application/json') ? 'no-cache' : 'public, max-age=300',
			'last-modified': st.mtime.toUTCString()
		}
	});
}
