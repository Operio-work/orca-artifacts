import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AUTOCOMMIT, GIT_PUSH, REPO_DIR } from './config';

const run = promisify(execFile);
const pending = new Map<string, string>(); // path -> message
let timer: NodeJS.Timeout | null = null;
let chain: Promise<void> = Promise.resolve();

/**
 * Record a change made from the app. After 20 s of quiet, commit only these paths
 * (other staged work in the clone is left alone); push too when ARTIFACTS_GIT_PUSH=1.
 */
export function queueCommit(path: string, message: string) {
	if (!AUTOCOMMIT) return;
	pending.set(path, message);
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		timer = null;
		chain = chain.then(flush).catch((e) => console.error('[git] commit failed:', e?.stderr || e));
	}, 20_000);
}

async function flush() {
	if (!pending.size) return;
	const paths = [...pending.keys()];
	const msgs = [...new Set(pending.values())];
	pending.clear();
	const git = (...a: string[]) => run('git', a, { cwd: REPO_DIR });
	await git('add', '--all', '--', ...paths);
	const { stdout } = await git('diff', '--cached', '--name-only', '--', ...paths);
	if (!stdout.trim()) return;
	const msg = `app: ${msgs.join('; ')}`.slice(0, 200);
	await git('commit', '-m', msg, '--only', '--', ...paths);
	console.log('[git] committed', paths.join(', '));
	if (!GIT_PUSH) return;
	try {
		await git('push', '--quiet');
	} catch (e) {
		console.error('[git] push failed (commit kept locally):', (e as { stderr?: string }).stderr ?? e);
	}
}
