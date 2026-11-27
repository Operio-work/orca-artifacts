<script lang="ts">
	import { BASE } from '#lib/base.js';
	import type { Collection, ViewItem } from '#lib/types.js';
	import { t, tl, fmtDate } from '#lib/i18n.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import KindIcon from './KindIcon.svelte';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import FolderInput from '@lucide/svelte/icons/folder-input';
	import Tags from '@lucide/svelte/icons/tags';
	import NotebookText from '@lucide/svelte/icons/notebook-text';
	import LinkIcon from '@lucide/svelte/icons/link';
	import Pencil from '@lucide/svelte/icons/pencil';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Check from '@lucide/svelte/icons/check';
	import { page } from '$app/state';
	import { noteHref } from '#lib/notes.js';


	let {
		item,
		collections,
		view = 'grid',
		onpin,
		onassign,
		ontags,
		onnewcollection,
		ontag,
		onreview
	}: {
		item: ViewItem;
		collections: Collection[];
		view?: 'grid' | 'list';
		onpin: (i: ViewItem) => void;
		onassign: (i: ViewItem, c: string | null) => void;
		ontags: (i: ViewItem) => void;
		onnewcollection: (i: ViewItem) => void;
		ontag: (tag: string) => void;
		onreview?: (i: ViewItem, verdict: 'approve' | 'reject') => void;
	} = $props();

	const kindLabel = $derived(t(`kind_${item.kind}`));
	const col = $derived(collections.find((c) => c.id === item.collection));
	const noteUrl = $derived(noteHref(page.data.brand, item.note));

	async function copy() {
		const { toast } = await import('svelte-sonner');
		await navigator.clipboard.writeText(new URL(item.href, location.href).href);
		toast.success(t('copied'));
	}
</script>

{#snippet menu()}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon-sm" aria-label="Menu"><Ellipsis /></Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-56">
			<DropdownMenu.Item onclick={() => onpin(item)}>
				{#if item.pinned}<PinOff /> {t('unpin')}{:else}<Pin /> {t('pin')}{/if}
			</DropdownMenu.Item>
			{#if page.data.canEdit}
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger><FolderInput /> {t('moveTo')}</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent class="w-52">
					<DropdownMenu.Item onclick={() => onassign(item, null)}>
						<Check class={item.collection ? 'opacity-0' : ''} />
						{t('noCollection')}
					</DropdownMenu.Item>
					{#each collections as c (c.id)}
						<DropdownMenu.Item onclick={() => onassign(item, c.id)}>
							<Check class={item.collection === c.id ? '' : 'opacity-0'} />
							{c.name}
						</DropdownMenu.Item>
					{/each}
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => onnewcollection(item)}><FolderPlus /> {t('newCollection')}</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
			<DropdownMenu.Item onclick={() => ontags(item)}><Tags /> {t('editTags')}</DropdownMenu.Item>
			{#if item.kind === 'dashboard'}
				<DropdownMenu.Item onclick={() => (location.href = `${BASE}/d/${item.slug}/edit`)}><Pencil /> {t('edit')}</DropdownMenu.Item>
			{/if}
			{/if}
			<DropdownMenu.Separator />
			{#if noteUrl}
				<DropdownMenu.Item onclick={() => window.open(noteUrl, '_blank', 'noopener')}>
					<NotebookText /> {page.data.brand.notes?.label ?? t('openNote')}
				</DropdownMenu.Item>
			{/if}
			<DropdownMenu.Item onclick={copy}><LinkIcon /> {t('copyLink')}</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

{#snippet pinBtn()}
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={item.pinned ? t('unpin') : t('pin')}
		aria-pressed={item.pinned}
		class={item.pinned ? 'text-ink' : 'text-dim opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'}
		onclick={() => onpin(item)}
	>
		<Pin class={item.pinned ? 'fill-current' : ''} />
	</Button>
{/snippet}

{#snippet review()}
	{#if item.status === 'draft' && onreview}
		<div class="relative z-10 flex flex-wrap items-center gap-2">
			<Button size="xs" onclick={() => onreview(item, 'approve')}><Check /> {t('approve')}</Button>
			<Button size="xs" variant="outline" onclick={() => onreview(item, 'reject')}>{t('reject')}</Button>
		</div>
	{/if}
{/snippet}

{#snippet meta()}
	{#if item.status === 'draft'}<span class="rounded-full bg-accent px-1.5 text-ink">{t('draft')}</span>{#if item.by}<span class="truncate normal-case">· {item.by}</span>{/if}<span>·</span>{/if}
	<span class="inline-flex items-center gap-1"><KindIcon kind={item.kind} class="size-3.5" />{kindLabel}</span>
	{#if item.updated}<span>· {fmtDate(item.updated)}</span>{/if}
	{#if col}<span class="truncate">· {col.name}</span>{/if}
{/snippet}

{#snippet tags()}
	{#each item.allTags as tag (tag)}
		<button
			type="button"
			class="rounded-full border bg-muted px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:border-primary"
			onclick={() => ontag(tag)}>#{tag}</button
		>
	{/each}
{/snippet}

{#if view === 'grid'}
	<article class="group relative flex h-full flex-col rounded-lg border bg-card p-4 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-ring/40">
		<div class="flex items-start gap-2">
			<a href={item.href} class="min-w-0 flex-1 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none" data-sveltekit-reload={item.kind !== 'dashboard' ? true : undefined}>
				<h3 class="line-clamp-2 font-bold leading-tight text-pretty">{tl(item.title)}</h3>
			</a>
			<div class="relative z-10 -mt-1 -mr-2 flex shrink-0">
				{@render pinBtn()}
				{@render menu()}
			</div>
		</div>
		{#if tl(item.description)}
			<p class="mt-1.5 line-clamp-3 text-sm text-[var(--text-secondary)]">{tl(item.description)}</p>
		{/if}
		<div class="mt-auto pt-3">
			{#if item.status === 'draft'}<div class="mb-3">{@render review()}</div>{/if}
			{#if item.allTags.length}<div class="relative z-10 mb-2 flex flex-wrap gap-1">{@render tags()}</div>{/if}
			<div class="flex min-w-0 items-center gap-1 font-mono text-[11px] tracking-wide text-[var(--text-tertiary)] uppercase">
				{@render meta()}
			</div>
		</div>
	</article>
{:else}
	<article class="group relative flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted">
		<KindIcon kind={item.kind} class="size-4 shrink-0 text-[var(--text-tertiary)]" />
		<div class="min-w-0 flex-1">
			<a href={item.href} class="block truncate font-semibold after:absolute after:inset-0 after:content-['']" data-sveltekit-reload={item.kind !== 'dashboard' ? true : undefined}>{tl(item.title)}</a>
			<div class="flex min-w-0 items-center gap-1 truncate font-mono text-[11px] tracking-wide text-[var(--text-tertiary)] uppercase">
				{@render meta()}
			</div>
		</div>
		{#if item.status === 'draft'}{@render review()}{:else if item.allTags.length}<div class="relative z-10 hidden max-w-[40%] flex-wrap justify-end gap-1 md:flex">{@render tags()}</div>{/if}
		<div class="relative z-10 flex shrink-0">
			{@render pinBtn()}
			{@render menu()}
		</div>
	</article>
{/if}
