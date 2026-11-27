/**
 * Where the app is served from: "" (the root) or a path such as "/c/acme/artifacts".
 * Set at build time with ARTIFACTS_BASE (see vite.config.ts); every absolute link adds it.
 */
declare const __ARTIFACTS_BASE__: string;
export const BASE: string = typeof __ARTIFACTS_BASE__ === 'string' ? __ARTIFACTS_BASE__ : '';

/** "/d/x" → "<base>/d/x". Leaves full URLs and relative paths alone. */
export const withBase = (p: string) => (p.startsWith('/') && !p.startsWith('//') ? BASE + p : p);
