// Single sign-in with ORCA (ARTIFACTS_AUTH=orca).
//
// ORCA and ORCA Host say who someone is with a signed value (the same format ORCA's own panel
// trusts, lib/identity.js in the ORCA repo):
//   v1.<base64url(JSON)>.<base64url(HMAC-SHA256(secret, "v1." + payload))>
//   JSON: { u: id, n: display name, r: role, c: 0|1, t: ms }
// It arrives two ways:
//   - X-Orca-User on every request, from ORCA Host's proxy (hosted clients);
//   - a one-time ?ticket= on /auth/orca, from the Artifacts button in a self-hosted ORCA panel.
//     The app checks it and keeps the person in a signed cookie (oa_session, 30 days).
// The secret is ARTIFACTS_ORCA_SECRET, or else derived from ARTIFACTS_PUBLISH_TOKEN, so a
// self-hosted ORCA that can publish (operio-orca artifact setup URL TOKEN) can also sign people in.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const IDENTITY_HEADER = 'x-orca-user';
export const MAX_AGE_MS = 5 * 60_000;
export const SESSION_COOKIE = 'oa_session';
export const SESSION_DAYS = 30;
export const ROLES = ['operio_admin', 'operio_ops', 'client_admin', 'client_viewer'] as const;
export type Role = (typeof ROLES)[number];

export interface Person {
	id: string;
	name: string;
	role: Role;
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const mac = (secret: string, text: string) => createHmac('sha256', secret).update(text).digest();
function same(a: string, b: string) {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

/** The shared secret: set outright, or derived from the publish token (ORCA derives the same). */
export function ssoSecret(explicit: string, publishToken: string): string {
	if (explicit) return explicit;
	return publishToken ? b64(mac(publishToken, 'orca-artifacts/sso/v1')) : '';
}

/** What ORCA / ORCA Host send (exported for tests and for anyone building a sign-in bridge). */
export function signPerson(secret: string, p: Person, now = Date.now()): string {
	const payload = b64(JSON.stringify({ u: p.id, n: p.name, r: p.role, c: 0, t: now }));
	return `v1.${payload}.${b64(mac(secret, 'v1.' + payload))}`;
}

function parse(value: string, check: string): Record<string, unknown> | null {
	const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(value);
	if (!m || !same(m[2], b64(mac(check, 'v1.' + m[1])))) return null;
	try {
		return JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
	} catch {
		return null;
	}
}

function person(p: Record<string, unknown> | null): Person | null {
	if (!p || typeof p.u !== 'string' || !/^[A-Za-z0-9_.@:-]{1,64}$/.test(p.u)) return null;
	if (!ROLES.includes(p.r as Role)) return null;
	const name = String(p.n ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 60) || p.u;
	return { id: p.u, name, role: p.r as Role };
}

/** A header or ticket from ORCA: the person, or null when missing, forged, stale or malformed. */
export function verifyPerson(secret: string, value: string | null | undefined, now = Date.now()): Person | null {
	if (!secret || typeof value !== 'string' || value.length > 2048) return null;
	const p = parse(value, secret);
	if (!p || typeof p.t !== 'number' || Math.abs(now - p.t) > MAX_AGE_MS) return null;
	return person(p);
}

// Sessions use their own key, so a cookie can never pass as a header or a ticket.
const sessionKey = (secret: string) => b64(mac(secret, 'orca-artifacts/session/v1'));

export function signSession(secret: string, p: Person, now = Date.now()): string {
	const payload = b64(JSON.stringify({ u: p.id, n: p.name, r: p.role, x: now + SESSION_DAYS * 864e5 }));
	return `v1.${payload}.${b64(mac(sessionKey(secret), 'v1.' + payload))}`;
}

export function verifySession(secret: string, value: string | null | undefined, now = Date.now()): Person | null {
	if (!secret || typeof value !== 'string' || value.length > 2048) return null;
	const p = parse(value, sessionKey(secret));
	if (!p || typeof p.x !== 'number' || p.x < now) return null;
	return person(p);
}

/** Viewers look; everyone else may approve, organize and edit. */
export const canEdit = (role: Role | 'admin') => role !== 'client_viewer';
