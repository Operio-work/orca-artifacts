import { describe, expect, it } from 'vitest';
import { fromAcceptLanguage } from './hooks.server';

describe('fromAcceptLanguage', () => {
	it('follows the browser', () => {
		expect(fromAcceptLanguage('en-US,en;q=0.9')).toBe('en');
		expect(fromAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toBe('es');
		expect(fromAcceptLanguage('en;q=0.5,es;q=0.9')).toBe('es');
	});
	it('falls back to Spanish', () => {
		expect(fromAcceptLanguage(null)).toBe('es');
		expect(fromAcceptLanguage('fr-FR,fr;q=0.9')).toBe('es');
		expect(fromAcceptLanguage('fr,en;q=0.5')).toBe('en');
	});
});
