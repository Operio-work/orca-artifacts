// PM2 example. Copy, set your paths, then: pnpm build && pm2 start ecosystem.config.cjs
module.exports = {
	apps: [
		{
			name: 'orca-artifacts',
			cwd: __dirname,
			script: 'build/index.js',
			env: {
				NODE_ENV: 'production',
				HOST: '127.0.0.1',
				PORT: '5199',
				ORIGIN: 'http://localhost:5199', // the URL people open (needed for form posts)
				ARTIFACTS_LIBRARY: './library', // your artifacts folder; default ./library, else ./demo-library
				ARTIFACTS_AUTH: 'none', // none | tailscale | header
				ARTIFACTS_STORAGE: 'folder' // folder | git
				// ARTIFACTS_GIT_PUSH: '1',
				// ARTIFACTS_TZ: 'America/New_York',
			},
			max_memory_restart: '300M'
		}
	]
};
