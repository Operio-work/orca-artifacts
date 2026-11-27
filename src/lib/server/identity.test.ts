import { describe, expect, it } from 'vitest';
import { signPerson, signSession, ssoSecret, verifyPerson, verifySession } from './identity';

// The same vector as ORCA's test/identity.test.js and ORCA Host's tests/identity.test.ts.
const T = 1794700000000;
const VECTOR = 'v1.eyJ1IjoiYWJjMTIzIiwibiI6IkFuYSIsInIiOiJjbGllbnRfYWRtaW4iLCJjIjoxLCJ0IjoxNzk0NzAwMDAwMDAwfQ.OyueC2qFwMlFKkD3gYWoFtRfxtJucuhQ57b-OWMwjAE';

describe('ORCA identity', () => {
	it('reads what ORCA and ORCA Host sign', () => {
		expect(verifyPerson('test-secret', VECTOR, T + 1000)).toEqual({ id: 'abc123', name: 'Ana', role: 'client_admin' });
	});
	it('refuses a wrong secret, tampering, staleness and bad roles', () => {
		expect(verifyPerson('other', VECTOR, T)).toBeNull();
		expect(verifyPerson('test-secret', VECTOR, T + 6 * 60_000)).toBeNull();
		const [v, p, s] = VECTOR.split('.');
		expect(verifyPerson('test-secret', `${v}.${p}x.${s}`, T)).toBeNull();
		expect(verifyPerson('test-secret', signPerson('test-secret', { id: 'a', name: 'A', role: 'root' as never }, T), T)).toBeNull();
		expect(verifyPerson('', VECTOR, T)).toBeNull();
		expect(verifyPerson('test-secret', null, T)).toBeNull();
	});
	it('strips markup from names', () => {
		const v = signPerson('k', { id: 'x1', name: '<b>Ana</b>', role: 'client_viewer' }, T);
		expect(verifyPerson('k', v, T)?.name).toBe('bAna/b');
	});
	it('sessions last 30 days and never pass as a header (or the other way round)', () => {
		const p = { id: 'x1', name: 'Ana', role: 'client_admin' as const };
		const c = signSession('k', p, T);
		expect(verifySession('k', c, T + 29 * 864e5)).toEqual(p);
		expect(verifySession('k', c, T + 31 * 864e5)).toBeNull();
		expect(verifyPerson('k', c, T)).toBeNull();
		expect(verifySession('k', signPerson('k', p, T), T)).toBeNull();
	});
	it('derives the sign-in secret from the publish token (ORCA derives the same)', () => {
		expect(ssoSecret('set', 'x'.repeat(24))).toBe('set');
		expect(ssoSecret('', '')).toBe('');
		expect(ssoSecret('', 'x'.repeat(24))).toBe('ETUP5H30-KMfchE4UkDCWwyef8GK0KVsj3dF4g7MIpM');
	});
});
