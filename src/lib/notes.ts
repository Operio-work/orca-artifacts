import type { Brand } from './types';

/** Link for an artifact's note: a full URL is used as is; an id goes through the library's notes.url ({id}). */
export function noteHref(brand: Pick<Brand, 'notes'>, note?: string | null): string | null {
	if (!note) return null;
	if (/^https?:\/\//.test(note)) return note;
	if (!brand.notes) return null;
	return brand.notes.url.includes('{id}') ? brand.notes.url.replace('{id}', encodeURIComponent(note)) : brand.notes.url + encodeURIComponent(note);
}
