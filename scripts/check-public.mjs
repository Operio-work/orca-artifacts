#!/usr/bin/env node
// Fails if tracked files contain private-network details. Runs in CI before anything is published.
// Extra private patterns can be listed (one regex per line) in a file outside the repo, passed as
// PRIVATE_PATTERNS_FILE; CI uses only the generic ones below.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const generic = [
	String.raw`\b192\.168\.\d{1,3}\.\d{1,3}\b`,
	String.raw`\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`,
	String.raw`\b172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b`,
	String.raw`\b100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b`,
	String.raw`[a-z0-9-]+\.ts\.net\b`,
	String.raw`(sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,}`,
	String.raw`sk-ant-[A-Za-z0-9-]{10,}`,
	String.raw`ghp_[A-Za-z0-9]{20,}`
];
const extra = process.env.PRIVATE_PATTERNS_FILE
	? readFileSync(process.env.PRIVATE_PATTERNS_FILE, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
	: [];
const res = [...generic, ...extra].map((p) => new RegExp(p, 'i'));
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
	.split('\n')
	.filter((f) => f && !/(^|\/)pnpm-lock\.yaml$|\.(png|jpg|webp|woff2?)$/.test(f) && f !== 'scripts/check-public.mjs');
let bad = 0;
for (const f of files) {
	let text;
	try { text = readFileSync(f, 'utf8'); } catch { continue; }
	text.split('\n').forEach((line, i) => {
		for (const re of res) if (re.test(line)) { console.error(`${f}:${i + 1}: matches ${re}`); bad++; }
	});
}
if (bad) { console.error(`\n${bad} private match(es). Remove them before publishing.`); process.exit(1); }
console.log(`check-public: ${files.length} files clean`);
