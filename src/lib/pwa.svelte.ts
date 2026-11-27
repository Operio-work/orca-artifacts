/** Install prompt + online state, shared by the brand bar and the root layout. */
interface InstallEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const pwa = $state({ online: true, canInstall: false });
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
		navigator.serviceWorker.register('/service-worker.js', { type: import.meta.env.DEV ? 'module' : 'classic' }).catch((e) => console.warn('[pwa] service worker:', e));
	}
}

export async function install() {
	if (!deferred) return;
	await deferred.prompt();
	await deferred.userChoice;
	deferred = null;
	pwa.canInstall = false;
}
