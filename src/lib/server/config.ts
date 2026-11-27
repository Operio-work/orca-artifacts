import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Brand } from '#lib/types.js';

/**
 * The library: the folder that holds your artifacts (site/, dashboards/, state/, var/).
 * ARTIFACTS_LIBRARY wins; ARTIFACTS_REPO is the old name. Default: ./library, else the bundled demo.
 */
function libraryDir(): string {
	const env = process.env.ARTIFACTS_LIBRARY || process.env.ARTIFACTS_REPO;
	if (env) return resolve(env);
	const own = resolve(process.cwd(), 'library');
	return existsSync(own) ? own : resolve(process.cwd(), 'demo-library');
}

export const REPO_DIR = libraryDir();
export const SITE_DIR = resolve(REPO_DIR, 'site');
export const DASH_DIR = resolve(REPO_DIR, 'dashboards');
export const DASH_DATA_DIR = resolve(DASH_DIR, 'data');
export const STATE_DIR = resolve(REPO_DIR, 'state'); // shared organization (collections, tags)
export const VAR_DIR = resolve(REPO_DIR, 'var'); // per-viewer pins; keep out of git
/** Folders under site/ that are app internals, not artifacts. */
export const SITE_SKIP = new Set(['assets', 'archive']);
export const RESERVED = new Set(['d', 'api', '_app', 'healthz', 'assets', 'archive', 'icons']);

/** Who is viewing. none = everyone is "local"; tailscale = Tailscale Serve identity headers;
 *  header = any reverse proxy that sets ARTIFACTS_USER_HEADER (oauth2-proxy, Authelia, …). */
export type AuthMode = 'none' | 'tailscale' | 'header';
export const AUTH: AuthMode = (['none', 'tailscale', 'header'] as const).find((m) => m === process.env.ARTIFACTS_AUTH) ?? 'none';
export const USER_HEADER = (process.env.ARTIFACTS_USER_HEADER || 'x-forwarded-user').toLowerCase();
export const USER_NAME_HEADER = (process.env.ARTIFACTS_USER_NAME_HEADER || '').toLowerCase();

/** folder = plain files; git = commit the app's saves (dashboards/, state/) after 20 s of quiet. */
const legacyAutocommit = process.env.ARTIFACTS_AUTOCOMMIT === '1';
export const STORAGE: 'folder' | 'git' = process.env.ARTIFACTS_STORAGE === 'git' || legacyAutocommit ? 'git' : 'folder';
export const AUTOCOMMIT = STORAGE === 'git';
/** Push after each commit. Off unless asked (old ARTIFACTS_AUTOCOMMIT=1 setups pushed). */
export const GIT_PUSH = process.env.ARTIFACTS_GIT_PUSH ? process.env.ARTIFACTS_GIT_PUSH === '1' : legacyAutocommit;

const DEFAULT_BRAND: Brand = {
	name: 'ORCA Artifacts',
	org: '',
	logo: '/icons/orca-artifacts.svg',
	timeZone: 'UTC',
	notes: null,
	theme: '',
	source: ''
};

const str = (v: unknown, fb: string) => (typeof v === 'string' && v.trim() ? v.trim() : fb);
const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//.test(v);

/** Pure: raw config JSON (+ env time zone) → Brand. Exported for tests. */
export function parseBrand(raw: Record<string, unknown>, envTz?: string): Brand {
	let timeZone = str(envTz ?? raw.timeZone, DEFAULT_BRAND.timeZone);
	try {
		new Intl.DateTimeFormat('en', { timeZone });
	} catch {
		console.error(`[config] unknown time zone "${timeZone}", using UTC`);
		timeZone = 'UTC';
	}
	const n = (raw.notes ?? null) as Record<string, unknown> | null;
	const notes = n && isUrl(n.url) ? { label: str(n.label, 'Notes'), url: n.url, home: isUrl(n.home) ? n.home : '' } : null;
	return {
		name: str(raw.name, DEFAULT_BRAND.name),
		org: str(raw.org, ''),
		logo: str(raw.logo, DEFAULT_BRAND.logo),
		timeZone,
		notes,
		theme: typeof raw.theme === 'string' && /^\/[^\s]*\.css$/.test(raw.theme) ? raw.theme : '',
		source: str(raw.source, '')
	};
}

/** Branding and note links come from <library>/orca-artifacts.config.json (all fields optional). */
function loadBrand(): Brand {
	let raw: Record<string, unknown> = {};
	try {
		raw = JSON.parse(readFileSync(resolve(REPO_DIR, 'orca-artifacts.config.json'), 'utf8'));
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error('[config] orca-artifacts.config.json:', (e as Error).message);
	}
	return parseBrand(raw, process.env.ARTIFACTS_TZ);
}

export const BRAND: Brand = loadBrand();
