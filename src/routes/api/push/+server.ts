import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanSub, isSubscribed, notify, subscribe, unsubscribe, vapidKeys } from '#lib/server/push.js';

/** The public key browsers subscribe with. */
export const GET: RequestHandler = async () => json({ key: (await vapidKeys()).publicKey });

/** { op: 'on', sub } · { op: 'off', endpoint } · { op: 'status', endpoint } · { op: 'test', endpoint } */
export const POST: RequestHandler = async ({ request, locals }) => {
	const b = await request.json().catch(() => null);
	switch (b?.op) {
		case 'on': {
			const sub = cleanSub(b.sub);
			if (!sub) error(400, 'not a push subscription');
			await subscribe({ ...sub, user: locals.user || 'local', lang: locals.lang, edit: locals.canEdit });
			return json({ ok: true });
		}
		case 'off':
			if (typeof b.endpoint === 'string') await unsubscribe(b.endpoint);
			return json({ ok: true });
		case 'status':
			return json({ on: typeof b.endpoint === 'string' && (await isSubscribed(b.endpoint)) });
		case 'test': {
			if (typeof b.endpoint !== 'string') error(400, 'endpoint required');
			const sent = await notify(
				{ title: { es: 'Alertas activadas', en: 'Alerts are on' }, body: { es: 'Así se verán los avisos.', en: 'This is how alerts look.' }, url: '/', tag: 'test' },
				(s) => s.endpoint === b.endpoint
			);
			return json({ ok: sent > 0 });
		}
	}
	error(400, 'unknown op');
};
