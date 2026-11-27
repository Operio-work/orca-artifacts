import { describe, expect, it } from 'vitest';
import { parseBrand } from '#lib/server/config.js';
import { noteHref } from '#lib/notes.js';
import { viewer } from '../hooks.server';

describe('parseBrand', () => {
	it('defaults', () => {
		const b = parseBrand({});
		expect(b.name).toBe('ORCA Artifacts');
		expect(b.timeZone).toBe('UTC');
		expect(b.notes).toBeNull();
		expect(b.theme).toBe('');
	});
	it('reads the library config', () => {
		const b = parseBrand({ name: 'Acme', org: 'Ops', timeZone: 'America/New_York', notes: { label: 'Wiki', url: 'https://wiki.example/{id}', home: 'https://wiki.example/' }, theme: '/assets/theme.css' });
		expect(b).toMatchObject({ name: 'Acme', org: 'Ops', timeZone: 'America/New_York', theme: '/assets/theme.css' });
		expect(b.notes).toEqual({ label: 'Wiki', url: 'https://wiki.example/{id}', home: 'https://wiki.example/' });
	});
	it('rejects bad values', () => {
		const b = parseBrand({ timeZone: 'Mars/Base', notes: { url: 'javascript:alert(1)' }, theme: 'https://evil.example/x.css' });
		expect(b.timeZone).toBe('UTC');
		expect(b.notes).toBeNull();
		expect(b.theme).toBe('');
	});
	it('env time zone wins', () => {
		expect(parseBrand({ timeZone: 'Europe/Paris' }, 'Asia/Tokyo').timeZone).toBe('Asia/Tokyo');
	});
});

describe('noteHref', () => {
	const brand = { notes: { label: 'Wiki', url: 'https://wiki.example/n/{id}', home: '' } };
	it('fills the id', () => expect(noteHref(brand, 'abc 1')).toBe('https://wiki.example/n/abc%201'));
	it('keeps full URLs', () => expect(noteHref({ notes: null }, 'https://x.example/p')).toBe('https://x.example/p'));
	it('no notes config → no link for ids', () => expect(noteHref({ notes: null }, 'abc')).toBeNull());
	it('appends when there is no {id}', () => expect(noteHref({ notes: { label: '', url: 'https://w/#', home: '' } }, 'q')).toBe('https://w/#q'));
	it('empty → null', () => expect(noteHref(brand, '')).toBeNull());
});

describe('viewer', () => {
	const h = new Headers({ 'tailscale-user-login': 'ana@example.com', 'tailscale-user-name': 'Ana', 'x-forwarded-user': 'bob' });
	it('none ignores headers', () => expect(viewer(h, 'none')).toEqual({ user: 'local', name: 'local' }));
	it('tailscale', () => expect(viewer(h, 'tailscale')).toEqual({ user: 'ana@example.com', name: 'Ana' }));
	it('header', () => expect(viewer(h, 'header', 'x-forwarded-user', '')).toEqual({ user: 'bob', name: 'bob' }));
	it('missing header → local', () => expect(viewer(new Headers(), 'tailscale')).toEqual({ user: 'local', name: 'local' }));
});
