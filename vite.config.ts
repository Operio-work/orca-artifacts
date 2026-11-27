import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

// ARTIFACTS_BASE=/c/acme/artifacts serves the app under a path (ORCA Host does this per client).
const base = process.env.ARTIFACTS_BASE ?? '';
if (base && !/^(\/[A-Za-z0-9._~-]+)+$/.test(base)) throw new Error(`ARTIFACTS_BASE must look like /path/to/app (got "${base}")`);

export default defineConfig({
	define: { __ARTIFACTS_BASE__: JSON.stringify(base) },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			paths: { base: base as '' | `/${string}` },
			adapter: adapter({ out: process.env.ARTIFACTS_OUT || 'build' })
		})
	],
	test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
