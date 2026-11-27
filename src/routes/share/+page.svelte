<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { BASE } from '#lib/base.js';
	import { api } from '#lib/api.js';
	import { t } from '#lib/i18n.svelte.js';
	import Brandbar from '#lib/components/Brandbar.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import FileIcon from '@lucide/svelte/icons/file';
	import Save from '@lucide/svelte/icons/save';

	let { data } = $props();
	const MAX = 4 * 1024 * 1024;
	let ready = $state(false);
	let saving = $state(false);
	let title = $state('');
	let text = $state('');
	let url = $state('');
	let file = $state<{ name: string; type: string; blob: Blob } | null>(null);
	let preview = $state('');
	const empty = $derived(!title.trim() && !text.trim() && !url.trim() && !file);

	onMount(async () => {
		try {
			const c = await caches.open('share');
			const meta = await c.match(`${BASE}/share/meta`);
			if (meta) {
				const m = await meta.json();
				title = m.title ?? '';
				text = m.text ?? '';
				url = m.url ?? '';
				const f = m.file ? await c.match(`${BASE}/share/file`) : null;
				if (f) {
					file = { name: m.file.name, type: m.file.type, blob: await f.blob() };
					if (file.type.startsWith('image/')) preview = URL.createObjectURL(file.blob);
				}
			}
		} catch {
			/* no cache API (plain http): nothing was shared */
		}
		ready = true;
	});

	async function clear() {
		const c = await caches.open('share').catch(() => null);
		await c?.delete(`${BASE}/share/meta`);
		await c?.delete(`${BASE}/share/file`);
	}

	const toB64 = (b: Blob) =>
		new Promise<string>((res, rej) => {
			const r = new FileReader();
			r.onload = () => res(String(r.result).split(',')[1] ?? '');
			r.onerror = () => rej(r.error);
			r.readAsDataURL(b);
		});

	async function save() {
		if (file && file.blob.size > MAX) return void toast.error(t('shareTooBig'));
		saving = true;
		try {
			const body = { title, text, url, file: file ? { name: file.name, type: file.type, base64: await toB64(file.blob) } : null };
			const r = await api<{ ok: boolean; problems?: string[] }>('/api/share', body);
			if (!r.ok) return void toast.error((r.problems ?? []).join(' · ') || 'Error');
			await clear();
			toast.success(t('shareSaved'));
			await goto(`${BASE}/?drafts=1`, { invalidateAll: true });
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>{t('shareTitle')}</title></svelte:head>

<main class="mx-auto max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 sm:px-6">
	<Brandbar />
	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>{t('shareTitle')}</Card.Title>
			<Card.Description>{t('shareHint')}</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-4">
			{#if !data.canEdit}
				<p class="text-sm text-[var(--text-secondary)]">{t('viewerOnly')}</p>
			{:else if ready && empty}
				<p class="text-sm text-[var(--text-secondary)]">{t('shareNothing')}</p>
			{/if}
			{#if data.canEdit}
				<div class="grid gap-1.5">
					<Label for="share-title">{t('shareName')}</Label>
					<Input id="share-title" bind:value={title} maxlength={120} />
				</div>
				<div class="grid gap-1.5">
					<Label for="share-url">{t('shareLink')}</Label>
					<Input id="share-url" type="url" inputmode="url" bind:value={url} placeholder="https://" />
				</div>
				<div class="grid gap-1.5">
					<Label for="share-text">{t('shareText')}</Label>
					<Textarea id="share-text" bind:value={text} rows={5} />
				</div>
				{#if file}
					<div class="grid gap-1.5">
						<span class="text-sm font-medium">{t('shareFile')}</span>
						{#if preview}
							<img src={preview} alt="" class="max-h-64 w-auto rounded-md border object-contain" />
						{/if}
						<div class="flex min-w-0 items-center gap-2 text-sm text-[var(--text-secondary)]"><FileIcon class="size-4 shrink-0" /><span class="truncate">{file.name}</span></div>
					</div>
				{/if}
			{/if}
		</Card.Content>
		{#if data.canEdit}
			<Card.Footer class="justify-end">
				<Button onclick={save} disabled={saving || empty}><Save /> {t('shareSave')}</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</main>
