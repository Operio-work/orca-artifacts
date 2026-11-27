import { BASE } from './base';

/** Install prompt + online state, shared by the brand bar and the root layout. */
interface InstallEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const pwa = $state({ online: true, canInstall: false, push: 'unsupported' as 'unsupported' | 'off' | 'on' | 'blocked' | 'busy' });
let deferred: InstallEvent | null = null;

/** Call once in the browser (root layout). */
export function initPwa() {
	pwa.online = navigator.onLine;
	addEventListener('online', () => (pwa.online = true));
	addEventListener('offline', () => (pwa.online = false));
	addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferred = e as InstallEvent;
		pwa.canInstall = true;
	});
	addEventListener('appinstalled', () => {
		deferred = null;
		pwa.canInstall = false;
	});
	// Service workers need a secure context (https, or localhost).
	if ('serviceWorker' in navigator && isSecureContext && navigator.onLine) {
		navigator.serviceWorker
			.register(`${BASE}/service-worker.js`, { type: import.meta.env.DEV ? 'module' : 'classic' })
			.then(() => pushState())
			.catch((e) => console.warn('[pwa] service worker:', e));
	}
}

export async function install() {
	if (!deferred) return;
	await deferred.prompt();
	await deferred.userChoice;
	deferred = null;
	pwa.canInstall = false;
}

// ---------- Push alerts ----------
const post = (body: unknown) =>
	fetch(`${BASE}/api/push`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => {
		if (!r.ok) throw new Error(String(r.status));
		return r.json();
	});

async function registration() {
	return navigator.serviceWorker.ready;
}

/** Is this browser subscribed (and does the server still have it)? */
async function pushState() {
	if (!('PushManager' in window) || !('Notification' in window)) return void (pwa.push = 'unsupported');
	if (Notification.permission === 'denied') return void (pwa.push = 'blocked');
	const sub = await (await registration()).pushManager.getSubscription();
	pwa.push = sub && (await post({ op: 'status', endpoint: sub.endpoint }).catch(() => ({ on: false }))).on ? 'on' : 'off';
}

const urlB64 = (s: string) => {
	const raw = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Turn alerts on (asks the browser) or off. Returns the new state. */
export async function togglePush(): Promise<typeof pwa.push> {
	const was = pwa.push;
	pwa.push = 'busy';
	try {
		const reg = await registration();
		if (was === 'on') {
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await post({ op: 'off', endpoint: sub.endpoint });
				await sub.unsubscribe();
			}
			return (pwa.push = 'off');
		}
		if ((await Notification.requestPermission()) !== 'granted') return (pwa.push = 'blocked');
		const { key } = await (await fetch(`${BASE}/api/push`)).json();
		let sub = await reg.pushManager.getSubscription();
		if (sub && sub.options.applicationServerKey) {
			const have = new Uint8Array(sub.options.applicationServerKey);
			const want = urlB64(key);
			if (have.length !== want.length || have.some((b, i) => b !== want[i])) {
				await sub.unsubscribe();
				sub = null;
			}
		}
		sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
		await post({ op: 'on', sub: sub.toJSON() });
		await post({ op: 'test', endpoint: sub.endpoint }).catch(() => {});
		return (pwa.push = 'on');
	} catch (e) {
		console.warn('[pwa] push:', e);
		pwa.push = was === 'busy' ? 'off' : was;
		throw e;
	}
}
