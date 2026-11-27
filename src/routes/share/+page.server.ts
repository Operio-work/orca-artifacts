import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { BASE } from '#lib/base.js';

// The share sheet posts to /share; the service worker normally answers first. Without it (not
// installed yet, or an old one) there is nothing to keep: open the page so the person can paste.
export const actions: Actions = {
	default: () => redirect(303, `${BASE}/share`)
};
