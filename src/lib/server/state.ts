import { join } from 'node:path';
import type { OrganizeState } from '#lib/types.js';
import { STATE_DIR, VAR_DIR } from './config';
import { readJson, writeJson } from './json';
import { queueCommit } from './git';

const ORG = join(STATE_DIR, 'organize.json');
const PINS = join(VAR_DIR, 'pins.json');

let lock: Promise<unknown> = Promise.resolve();
/** Serialize read-modify-write so two quick clicks can't lose an update. */
function locked<T>(fn: () => Promise<T>): Promise<T> {
	const next = lock.then(fn, fn);
	lock = next.catch(() => {});
	return next;
}

export const readOrganize = () =>
	readJson<OrganizeState>(ORG, { collections: [], items: {} });

export function updateOrganize(msg: string, fn: (s: OrganizeState) => void) {
	return locked(async () => {
		const s = await readOrganize();
		fn(s);
		// drop empty entries so the file stays readable
		for (const [k, v] of Object.entries(s.items)) {
			if (!v.collection && !v.tags?.length) delete s.items[k];
		}
		await writeJson(ORG, s);
		queueCommit('state/organize.json', msg);
		return s;
	});
}

type Pins = Record<string, string[]>;
export const readPins = async (user: string) => (await readJson<Pins>(PINS, {}))[user] ?? [];

export function setPin(user: string, key: string, on: boolean) {
	return locked(async () => {
		const all = await readJson<Pins>(PINS, {});
		const list = (all[user] ?? []).filter((k) => k !== key);
		if (on) list.unshift(key);
		all[user] = list;
		await writeJson(PINS, all);
		return list;
	});
}
