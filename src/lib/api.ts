import { toast } from 'svelte-sonner';
import { withBase } from './base';

export async function api<T = unknown>(url: string, body: unknown, method = 'POST'): Promise<T> {
	const res = await fetch(withBase(url), { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	const data = await res.json().catch(() => ({}));
	if (!res.ok && !(res.status === 422 || res.status === 409)) {
		toast.error(data?.message ?? `Error ${res.status}`);
		throw new Error(String(res.status));
	}
	return data as T;
}
export const stateOp = <T = unknown>(body: Record<string, unknown>) => api<T>('/api/state', body);
