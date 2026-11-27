<script lang="ts">
	import { page } from '$app/state';
	import { invalidate, replaceState, goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import type { Kind, ViewItem } from '#lib/types.js';
	import { t, tl } from '#lib/i18n.svelte.js';
	import { stateOp } from '#lib/api.js';
	import Brandbar from '#lib/components/Brandbar.svelte';
	import ArtifactCard from '#lib/components/ArtifactCard.svelte';
	import KindIcon from '#lib/components/KindIcon.svelte';
	import PromptDialog from '#lib/components/PromptDialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Pin from '@lucide/svelte/icons/pin';
	import Layers from '@lucide/svelte/icons/layers';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import ListIcon from '@lucide/svelte/icons/list';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import NotebookText from '@lucide/svelte/icons/notebook-text';

	let { data } = $props();

	// ---- local copies so actions feel instant; server reload reconciles ----
	let items = $state<ViewItem[]>([]);
	let collections = $state(untrack(() => data.collections));
	$effect(() => {
		items = data.items;
		collections = data.collections;
	});

	// ---- filters, mirrored in the URL so a view can be bookmarked ----
	const sp = untrack(() => page.url.searchParams);
	let q = $state(sp.get('q') ?? '');
	let nav = $state(sp.get('kind') ?? sp.get('c') ? (sp.get('kind') ? `kind:${sp.get('kind')}` : `c:${sp.get('c')}`) : sp.get('pinned') ? 'pinned' : 'all');
	let tag = $state(sp.get('tag') ?? '');
	let sort = $state<'recent' | 'name'>(sp.get('sort') === 'name' ? 'name' : 'recent');
	let view = $state<'grid' | 'list'>('grid');
	$effect(() => {
		try {
			const v = localStorage.getItem('orca.view');
			if (v === 'list' || v === 'grid') view = v;
		} catch {}
	});
	$effect(() => {
		try {
			localStorage.setItem('orca.view', view);
		} catch {}
	});
	$effect(() => {
		const u = new URL(page.url.href);
		u.search = '';
		if (q) u.searchParams.set('q', q);
		if (nav.startsWith('kind:')) u.searchParams.set('kind', nav.slice(5));
		if (nav.startsWith('c:')) u.searchParams.set('c', nav.slice(2));
		if (nav === 'pinned') u.searchParams.set('pinned', '1');
		if (tag) u.searchParams.set('tag', tag);
		if (sort === 'name') u.searchParams.set('sort', 'name');
		if (u.href !== page.url.href) untrack(() => replaceState(u, page.state));
	});

	const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
	const colName = (id?: string) => collections.find((c) => c.id === id)?.name ?? '';
	const hay = (i: ViewItem) =>
		norm([i.title.es, i.title.en, i.description.es, i.description.en, i.slug, colName(i.collection), ...i.allTags.map((x) => '#' + x), t(`kind_${i.kind}`)].join(' '));

	const filtered = $derived.by(() => {
		const tokens = norm(q).split(/\s+/).filter(Boolean);
		let list = items.filter((i) => {
			if (nav === 'pinned' && !i.pinned) return false;
			if (nav.startsWith('kind:') && i.kind !== nav.slice(5)) return false;
			if (nav.startsWith('c:') && i.collection !== nav.slice(2)) return false;
			if (tag && !i.allTags.includes(tag)) return false;
			if (tokens.length) {
				const h = hay(i);
				return tokens.every((tk) => h.includes(tk));
			}
			return true;
		});
		const title = (i: ViewItem) => tl(i.title).toLowerCase();
		list = [...list].sort((a, b) => {
			if (tokens.length) {
				// title hits first
				const ta = tokens.every((tk) => norm(title(a)).includes(tk)) ? 0 : 1;
				const tb = tokens.every((tk) => norm(title(b)).includes(tk)) ? 0 : 1;
				if (ta !== tb) return ta - tb;
			}
			return sort === 'name' ? title(a).localeCompare(title(b)) : String(b.updated ?? '').localeCompare(String(a.updated ?? ''));
		});
		return list;
	});

	const pinnedItems = $derived(data.pins.map((k) => items.find((i) => i.key === k)).filter((i): i is ViewItem => !!i));
	const showPinnedRow = $derived(nav === 'all' && !q && !tag && pinnedItems.length > 0);
	const counts = $derived({
		all: items.length,
		pinned: pinnedItems.length,
		dashboard: items.filter((i) => i.kind === 'dashboard').length,
		page: items.filter((i) => i.kind === 'page').length,
		archive: items.filter((i) => i.kind === 'archive').length
	});
	const allTags = $derived.by(() => {
		const m = new Map<string, number>();
		for (const i of items) for (const tg of i.allTags) m.set(tg, (m.get(tg) ?? 0) + 1);
		return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	});
	const navTitle = $derived(
		nav === 'all' ? t('all') : nav === 'pinned' ? t('pinned') : nav.startsWith('kind:') ? t(nav.slice(5) as Kind) : colName(nav.slice(2))
	);

	// ---- actions ----
	const refresh = () => invalidate('app:catalog');
	async function onpin(i: ViewItem) {
		const on = !i.pinned;
		i.pinned = on;
		await stateOp({ op: 'pin', key: i.key, on });
		refresh();
	}
	async function onassign(i: ViewItem, c: string | null) {
		i.collection = c ?? undefined;
		await stateOp({ op: 'assign', key: i.key, collection: c });
		refresh();
	}

	let prompt = $state<{ open: boolean; title: string; label: string; hint?: string; value: string; confirm: string; run: (v: string) => void }>({
		open: false, title: '', label: '', value: '', confirm: '', run: () => {}
	});
	function ask(p: Omit<typeof prompt, 'open'>) {
		prompt = { ...p, open: true };
	}
	function ontags(i: ViewItem) {
		const own = i.allTags.filter((x) => !i.tags.includes(x));
		ask({
			title: `${t('editTags')} · ${tl(i.title)}`,
			label: t('tags'),
			hint: t('tagsHint') + (i.tags.length ? ` · ${i.tags.map((x) => '#' + x).join(' ')}` : ''),
			value: own.join(', '),
			confirm: t('save'),
			run: async (v) => {
				const tags = v.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
				await stateOp({ op: 'tags', key: i.key, tags });
				refresh();
			}
		});
	}
	function newCollection(i?: ViewItem) {
		ask({
			title: t('newCollection'), label: t('name'), value: '', confirm: t('create'),
			run: async (name) => {
				if (!name) return;
				const r = await stateOp<{ id: string }>({ op: 'collection.create', name, key: i?.key });
				await refresh();
				if (!i) nav = `c:${r.id}`;
			}
		});
	}
	function renameCollection(id: string) {
		ask({
			title: t('rename'), label: t('name'), value: colName(id), confirm: t('save'),
			run: async (name) => {
				if (!name) return;
				await stateOp({ op: 'collection.rename', id, name });
				refresh();
			}
		});
	}
	async function deleteCollection(id: string) {
		if (!confirm(t('deleteCollection'))) return;
		await stateOp({ op: 'collection.delete', id });
		if (nav === `c:${id}`) nav = 'all';
		refresh();
	}

	// ---- keyboard: / focuses search, Ctrl/⌘+K opens the palette ----
	let searchEl = $state<HTMLInputElement | null>(null);
	let paletteOpen = $state(false);
	let sheetOpen = $state(false);
	function onkey(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = !paletteOpen;
		} else if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
			e.preventDefault();
			searchEl?.focus();
		}
	}
	function pickNav(n: string) {
		nav = n;
		sheetOpen = false;
	}
</script>

<svelte:head><title>{data.brand.name}</title></svelte:head>
<svelte:window onkeydown={onkey} />

{#snippet navBtn(id: string, label: string, count: number, icon: import('svelte').Snippet)}
	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted aria-[current=true]:bg-accent aria-[current=true]:font-semibold"
		aria-current={nav === id}
		onclick={() => pickNav(id)}
	>
		<span class="text-[var(--text-tertiary)] [&_svg]:size-4">{@render icon()}</span>
		<span class="min-w-0 flex-1 truncate">{label}</span>
		<span class="font-mono text-xs text-[var(--text-tertiary)] tabular-nums">{count}</span>
	</button>
{/snippet}

{#snippet sidebar()}
	<nav class="grid gap-0.5" aria-label={t('filters')}>
		{#snippet iAll()}<Layers />{/snippet}
		{#snippet iPin()}<Pin />{/snippet}
		{#snippet iDash()}<KindIcon kind="dashboard" />{/snippet}
		{#snippet iPage()}<KindIcon kind="page" />{/snippet}
		{#snippet iArch()}<KindIcon kind="archive" />{/snippet}
		{@render navBtn('all', t('all'), counts.all, iAll)}
		{@render navBtn('pinned', t('pinned'), counts.pinned, iPin)}
		{@render navBtn('kind:dashboard', t('dashboard'), counts.dashboard, iDash)}
		{@render navBtn('kind:page', t('page'), counts.page, iPage)}
		{@render navBtn('kind:archive', t('archive'), counts.archive, iArch)}
	</nav>

	<div class="mt-6 mb-1.5 flex items-center justify-between px-2.5">
		<span class="label-mono">{t('collections')}</span>
		<Button variant="ghost" size="icon-xs" aria-label={t('newCollection')} onclick={() => newCollection()}><Plus /></Button>
	</div>
	<div class="grid gap-0.5">
		{#each collections as c (c.id)}
			<div class="group/col relative">
				{#snippet iCol()}<Folder />{/snippet}
				{@render navBtn(`c:${c.id}`, c.name, items.filter((i) => i.collection === c.id).length, iCol)}
				<div class="absolute top-1/2 right-7 -translate-y-1/2 opacity-0 group-hover/col:opacity-100 focus-within:opacity-100">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon-xs" aria-label="Menu"><Ellipsis /></Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={() => renameCollection(c.id)}>{t('rename')}</DropdownMenu.Item>
							<DropdownMenu.Item class="text-destructive" onclick={() => deleteCollection(c.id)}>{t('delete')}</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
		{:else}
			<button type="button" class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-[var(--text-tertiary)] hover:bg-muted" onclick={() => newCollection()}>
				<FolderPlus class="size-4" />{t('newCollection')}
			</button>
		{/each}
	</div>

	{#if allTags.length}
		<div class="mt-6 mb-2 px-2.5"><span class="label-mono">{t('tags')}</span></div>
		<div class="flex flex-wrap gap-1 px-2">
			{#each allTags as [tg, n] (tg)}
				<button
					type="button"
					class="rounded-full border px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:border-primary aria-pressed:border-primary aria-pressed:bg-accent"
					aria-pressed={tag === tg}
					onclick={() => { tag = tag === tg ? '' : tg; sheetOpen = false; }}>#{tg} <span class="text-[var(--text-dim)]">{n}</span></button
				>
			{/each}
		</div>
	{/if}

	{#if data.brand.notes?.home}
		<a class="mt-8 flex items-center gap-2 px-2.5 text-xs text-ink hover:underline" href={data.brand.notes.home} target="_blank" rel="noopener">
			<NotebookText class="size-3.5" />{data.brand.notes.label} · {data.brand.name}
		</a>
	{/if}
{/snippet}

<div class="mx-auto max-w-[1280px] px-4 pt-5 pb-16 sm:px-6">
	<Brandbar>
		{#snippet actions()}
			<Button href="/d/new" size="sm"><Plus /> <span class="hidden sm:inline">{t('newDashboard')}</span></Button>
		{/snippet}
	</Brandbar>

	<h1 class="sr-only">{t('app')}</h1>

	<div class="mt-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
		<aside class="hidden lg:block"><div class="sticky top-5">{@render sidebar()}</div></aside>

		<main class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="outline" size="icon" class="lg:hidden" aria-label={t('filters')} onclick={() => (sheetOpen = true)}><SlidersHorizontal /></Button>
				<InputGroup.Root class="h-9 min-w-0 flex-1 bg-card">
					<InputGroup.Input bind:ref={searchEl} bind:value={q} placeholder={t('search')} type="search" aria-label={t('search')} />
					<InputGroup.Addon><Search /></InputGroup.Addon>
					<InputGroup.Addon align="inline-end" class="hidden sm:flex"><Kbd>/</Kbd></InputGroup.Addon>
				</InputGroup.Root>
				<ToggleGroup.Root type="single" variant="outline" bind:value={() => sort, (v) => v && (sort = v as typeof sort)} aria-label="Sort" class="bg-card">
					<ToggleGroup.Item value="recent" class="px-3 text-xs">{t('sortRecent')}</ToggleGroup.Item>
					<ToggleGroup.Item value="name" class="px-3 text-xs">{t('sortName')}</ToggleGroup.Item>
				</ToggleGroup.Root>
				<ToggleGroup.Root type="single" variant="outline" bind:value={() => view, (v) => v && (view = v as typeof view)} class="bg-card">
					<ToggleGroup.Item value="grid" aria-label={t('grid')}><LayoutGrid /></ToggleGroup.Item>
					<ToggleGroup.Item value="list" aria-label={t('list')}><ListIcon /></ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>

			{#if showPinnedRow}
				<section class="mt-6" aria-labelledby="pinned-h">
					<h2 id="pinned-h" class="label-mono mb-2 flex items-center gap-1.5"><Pin class="size-3.5" />{t('pinned')}</h2>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{#each pinnedItems as item (item.key)}
							<ArtifactCard {item} {collections} {onpin} {onassign} {ontags} onnewcollection={newCollection} ontag={(x) => (tag = x)} />
						{/each}
					</div>
				</section>
			{/if}

			<section class="mt-6">
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<h2 class="text-lg font-bold">{navTitle}</h2>
					<span class="font-mono text-xs text-[var(--text-tertiary)]">{filtered.length} {t('results')}</span>
					{#if tag}
						<button type="button" class="inline-flex items-center gap-1 rounded-full border border-primary bg-accent px-2 py-0.5 text-xs" onclick={() => (tag = '')}>#{tag} <X class="size-3" /></button>
					{/if}
					{#if q || tag || nav !== 'all'}
						<Button variant="link" size="xs" class="text-ink" onclick={() => { q = ''; tag = ''; nav = 'all'; }}>{t('clear')}</Button>
					{/if}
				</div>
				{#if filtered.length === 0}
					<p class="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-[var(--text-tertiary)]">{t('empty')}</p>
				{:else if view === 'grid'}
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{#each filtered as item (item.key)}
							<ArtifactCard {item} {collections} {onpin} {onassign} {ontags} onnewcollection={newCollection} ontag={(x) => (tag = x)} />
						{/each}
					</div>
				{:else}
					<div class="overflow-hidden rounded-lg border bg-card">
						{#each filtered as item (item.key)}
							<ArtifactCard {item} {collections} view="list" {onpin} {onassign} {ontags} onnewcollection={newCollection} ontag={(x) => (tag = x)} />
						{/each}
					</div>
				{/if}
			</section>
		</main>
	</div>

	<footer class="mt-12 flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 text-xs text-[var(--text-tertiary)]">
		{#if data.brand.notes?.home}<span>{t('notes')} <a class="text-ink hover:underline" href={data.brand.notes.home} target="_blank" rel="noopener">{data.brand.notes.label} · {data.brand.name}</a></span>{/if}
		{#if data.brand.source}<span>{t('source')} <code class="font-mono">{data.brand.source}</code></span>{/if}
		<span class="hidden sm:inline"><Kbd>Ctrl</Kbd> <Kbd>K</Kbd> {t('goTo')}</span>
	</footer>
</div>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content side="left" class="w-72 overflow-y-auto p-4 pt-10">{@render sidebar()}</Sheet.Content>
</Sheet.Root>

<PromptDialog bind:open={prompt.open} title={prompt.title} label={prompt.label} hint={prompt.hint} value={prompt.value} confirm={prompt.confirm} onsubmit={prompt.run} />

<Command.Dialog bind:open={paletteOpen} title={t('goTo')} description={t('search')}>
	<Command.Input placeholder={t('search')} />
	<Command.List>
		<Command.Empty>{t('empty')}</Command.Empty>
		<Command.Group heading={t('newDashboard')}>
			<Command.Item value="new dashboard nuevo tablero" onSelect={() => goto('/d/new')}><Plus /> {t('newDashboard')}</Command.Item>
		</Command.Group>
		{#if pinnedItems.length}
			<Command.Group heading={t('pinned')}>
				{#each pinnedItems as i (i.key)}
					<Command.Item value={`pin ${i.key} ${i.title.es} ${i.title.en}`} onSelect={() => (location.href = i.href)}><Pin /> {tl(i.title)}</Command.Item>
				{/each}
			</Command.Group>
		{/if}
		{#each ['dashboard', 'page', 'archive'] as const as k (k)}
			<Command.Group heading={t(k)}>
				{#each items.filter((i) => i.kind === k) as i (i.key)}
					<Command.Item value={`${i.key} ${i.title.es} ${i.title.en} ${i.allTags.join(' ')}`} onSelect={() => (location.href = i.href)}><KindIcon kind={k} /> {tl(i.title)}</Command.Item>
				{/each}
			</Command.Group>
		{/each}
	</Command.List>
</Command.Dialog>
