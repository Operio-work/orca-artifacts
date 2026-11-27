import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let lib = '';
let share: typeof import('./share');
let rebase: typeof import('./static').rebase;

beforeAll(async () => {
	lib = await mkdtemp(join(tmpdir(), 'oa-share-'));
	await mkdir(join(lib, 'site'), { recursive: true });
	process.env.ARTIFACTS_LIBRARY = lib;
	share = await import('./share');
	({ rebase } = await import('./static'));
});
afterAll(() => rm(lib, { recursive: true, force: true }));

const b64 = (s: string) => Buffer.from(s).toString('base64');

describe('share → draft page', () => {
	it('finds the link in the text', () => {
		expect(share.sharedUrl({ text: 'Look at this https://example.com/a?b=1 nice' })).toBe('https://example.com/a?b=1');
		expect(share.sharedUrl({ url: 'javascript:alert(1)', text: '' })).toBe('');
	});
	it('a link becomes a note page, escaped', () => {
		const r = share.buildShare({ title: '<Menu> & prices', text: 'see <b>this</b>', url: 'https://example.com/menu' });
		const html = r.files['index.html'].text!;
		expect(r.stem).toBe('menu-prices');
		expect(html).toContain('&lt;Menu&gt; &amp; prices');
		expect(html).toContain('see &lt;b&gt;this&lt;/b&gt;');
		expect(html).toContain('href="https://example.com/menu"');
		expect(JSON.parse(r.files['meta.json'].text!).tags).toEqual(['shared']);
	});
	it('takes the title from the host when there is none', () => {
		expect(share.buildShare({ url: 'https://www.example.org/x' }).title).toBe('example.org');
	});
	it('an image or PDF is shown; an .html file is kept as it is', () => {
		const img = share.buildShare({ file: { name: 'shot.png', type: 'image/png', base64: b64('png') } });
		expect(img.files['image.png'].base64).toBe(b64('png'));
		expect(img.files['index.html'].text).toContain('<img src="image.png"');
		const pdf = share.buildShare({ file: { name: 'menu.pdf', type: 'application/pdf', base64: b64('%PDF') } });
		expect(pdf.files['file.pdf']).toBeTruthy();
		const page = share.buildShare({ file: { name: 'report.html', type: 'text/html', base64: b64('<h1>Hi</h1>') } });
		expect(page.files['index.html'].text).toBe('<h1>Hi</h1>');
	});
	it('refuses what it cannot show', () => {
		expect(() => share.buildShare({ file: { name: 'a.exe', type: 'application/x-msdownload', base64: b64('MZ') } })).toThrow(/not supported/);
		expect(() => share.buildShare({})).toThrow(/nothing/);
	});
	it('saves a draft under a free slug', async () => {
		const a = await share.saveShare({ title: 'Weekly menu', text: 'hello' }, 'Ana');
		const b = await share.saveShare({ title: 'Weekly menu', text: 'again' }, 'Ana');
		expect(a).toMatchObject({ ok: true, status: 'draft', url: '/weekly-menu/' });
		expect(b.url).toBe('/weekly-menu-2/');
		const meta = JSON.parse(await readFile(join(lib, 'site', 'weekly-menu', 'meta.json'), 'utf8'));
		expect(meta).toMatchObject({ status: 'draft', by: 'Ana', title: { en: 'Weekly menu' } });
	});
});

describe('pages under a base path', () => {
	it('root-relative links gain the base', () => {
		const html = '<link href="/assets/a.css"><a href="//cdn.example/x">x</a><img src="pic.png"><div style="background:url(/assets/b.png)">';
		expect(rebase(html, 'html', '/c/acme/artifacts')).toBe('<link href="/c/acme/artifacts/assets/a.css"><a href="//cdn.example/x">x</a><img src="pic.png"><div style="background:url(/c/acme/artifacts/assets/b.png)">');
		expect(rebase(html, 'html', '')).toBe(html);
	});
});
