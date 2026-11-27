<script lang="ts">
	import { t, tl, fmtDate } from '#lib/i18n.svelte.js';
	import { stateOp } from '#lib/api.js';
	import Brandbar from '#lib/components/Brandbar.svelte';
	import Dashboard from '#lib/dash/Dashboard.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import Pin from '@lucide/svelte/icons/pin';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { noteHref } from '#lib/notes.js';
	import { goto } from '$app/navigation';
	import Check from '@lucide/svelte/icons/check';

	let { data } = $props();
	const spec = $derived(data.spec);
	const noteUrl = $derived(noteHref(data.brand, spec.note ?? spec.trilium));
	let pinned = $state(false);
	$effect(() => {
		pinned = data.pinned;
	});
	const updated = $derived(
		[spec.updated, ...Object.values(data.data).map((d) => d.updated)].filter(Boolean).sort().at(-1)
	);
	async function decide(verdict: 'approve' | 'reject') {
		await stateOp({ op: verdict, key: `dashboard:${spec.slug}` });
		const { toast } = await import('svelte-sonner');
		toast.success(t(verdict === 'approve' ? 'approved' : 'rejected'));
		await goto(verdict === 'approve' ? `/d/${spec.slug}` : '/?drafts=1', { invalidateAll: true });
	}
	async function togglePin() {
		pinned = !pinned;
		await stateOp({ op: 'pin', key: `dashboard:${spec.slug}`, on: pinned });
	}
</script>

<svelte:head><title>{tl(spec.title)} · {data.brand.name}</title></svelte:head>

<div class="mx-auto max-w-[1280px] px-4 pt-5 pb-16 sm:px-6">
	<Brandbar>
		{#snippet actions()}
			<Button variant="ghost" size="icon-sm" aria-label={pinned ? t('unpin') : t('pin')} aria-pressed={pinned} class={pinned ? 'text-ink' : ''} onclick={togglePin}>
				<Pin class={pinned ? 'fill-current' : ''} />
			</Button>
			<Button variant="outline" size="sm" href={`/d/${spec.slug}/edit`}><Pencil /> <span class="hidden sm:inline">{t('edit')}</span></Button>
		{/snippet}
	</Brandbar>

	<a href="/" class="mt-5 inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ArrowLeft class="size-3.5" />{t('back')}</a>

	{#if spec.status === 'draft'}
		<div role="status" class="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary bg-accent px-4 py-3 text-sm">
			<span class="min-w-0 flex-1">{t('draftBanner')}{#if spec.by} · {spec.by}{/if}</span>
			<Button size="sm" onclick={() => decide('approve')}><Check /> {t('approve')}</Button>
			<Button size="sm" variant="outline" onclick={() => decide('reject')}>{t('reject')}</Button>
		</div>
	{/if}
	<header class="mt-2 mb-5">
		<div class="label-mono">{t('kind_dashboard')}{#if spec.tags?.length} · {spec.tags.map((x) => '#' + x).join(' ')}{/if}</div>
		<h1 class="mt-2 text-[length:var(--text-2xl)] leading-tight font-extrabold tracking-tight text-balance">{tl(spec.title)}</h1>
		{#if spec.description}<p class="mt-2 max-w-[72ch] text-[var(--text-secondary)]">{tl(spec.description)}</p>{/if}
	</header>

	<Dashboard {spec} data={data.data} />

	<footer class="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 text-xs text-[var(--text-tertiary)]">
		{#if updated}<span>{t('updated')}: {fmtDate(updated)}</span>{/if}
		{#if noteUrl}
			<span>{t('notes')} <a class="text-ink hover:underline" href={noteUrl} target="_blank" rel="noopener">{data.brand.notes?.label ?? t('openNote')} · {tl(spec.title)}</a></span>
		{/if}
		<span>{t('source')} <code class="font-mono">{data.brand.source ? data.brand.source + ' · ' : ''}dashboards/{spec.slug}.json</code></span>
	</footer>
</div>
