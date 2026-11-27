<script lang="ts">
	import { BASE } from '#lib/base.js';
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { DashboardSpec, Rows, Widget, Agg, Format } from '#lib/types.js';
	import { validateSpec } from './validate.js';
	import { t, tl } from '#lib/i18n.svelte.js';
	import { api } from '#lib/api.js';
	import Dashboard from './Dashboard.svelte';
	import Pick from '#lib/components/Pick.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash from '@lucide/svelte/icons/trash-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	type DataFile = { file: string; lists: { path: string; count: number; fields: string[] }[] };
	let { initial }: { initial?: DashboardSpec } = $props();

	const blank = (): DashboardSpec => ({
		version: 1,
		slug: '',
		title: { es: '', en: '' },
		description: { es: '', en: '' },
		tags: [],
		range: false,
		sources: {},
		filters: [],
		widgets: []
	});
	/** Give every editable text an object to bind to (saved specs drop empty ones). */
	function normalize(s: DashboardSpec): DashboardSpec {
		s.description ??= { es: '', en: '' };
		s.filters ??= [];
		for (const w of s.widgets ?? []) if (w.type !== 'text') w.title ??= { es: '', en: '' };
		return s;
	}
	let spec = $state<DashboardSpec>(untrack(() => normalize(structuredClone(initial ?? blank()))));
	const previousSlug = untrack(() => initial?.slug);
	let slugTouched = $state(untrack(() => !!initial));
	let dirty = $state(false);

	// ---- available data ----
	let files = $state<DataFile[]>([]);
	onMount(async () => {
		files = await (await fetch(`${BASE}/api/sources`)).json();
	});
	const listOf = (file?: string, path?: string) => files.find((f) => f.file === file)?.lists.find((l) => l.path === (path ?? ''));
	function fieldsOf(source?: string): string[] {
		if (!source) return [];
		const s = spec.sources[source];
		if (!s) return [];
		if (Array.isArray(s.rows)) return [...new Set(s.rows.slice(0, 50).flatMap((r) => Object.keys(r)))];
		const fromList = listOf(s.file, s.path)?.fields;
		if (fromList) return fromList;
		const rows = preview[source]?.rows ?? [];
		return [...new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r)))];
	}
	const sourceNames = $derived(Object.keys(spec.sources));

	// ---- preview rows: refetched when sources change ----
	let preview = $state<Record<string, { rows: Rows; updated?: string; error?: string }>>({});
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const sources = $state.snapshot(spec.sources);
		clearTimeout(timer);
		timer = setTimeout(async () => {
			preview = await api('/api/sources', { sources });
		}, 300);
	});
	$effect(() => {
		JSON.stringify(spec);
		untrack(() => (dirty = true));
	});
	onMount(() => (dirty = false));

	// ---- basics ----
	const slugify = (s: string) =>
		s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	$effect(() => {
		const en = spec.title.en || spec.title.es;
		if (!untrack(() => slugTouched)) spec.slug = slugify(en);
	});
	let tagsText = $state(untrack(() => (spec.tags ?? []).join(', ')));
	$effect(() => {
		spec.tags = tagsText.split(',').map((s) => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
	});

	// ---- sources ----
	function addSource() {
		let n = 1;
		while (spec.sources[`s${n}`]) n++;
		const f = files[0];
		spec.sources[`s${n}`] = { file: f?.file ?? '', path: f?.lists[0]?.path ?? '' };
	}
	function renameSource(old: string, nu: string) {
		nu = nu.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 31);
		if (!nu || nu === old || spec.sources[nu]) return;
		const entries = Object.entries(spec.sources).map(([k, v]) => [k === old ? nu : k, v]);
		spec.sources = Object.fromEntries(entries);
		for (const f of spec.filters ?? []) if (f.source === old) f.source = nu;
		for (const w of spec.widgets) if (w.source === old) w.source = nu;
	}
	function removeSource(k: string) {
		delete spec.sources[k];
		spec.filters = (spec.filters ?? []).filter((f) => f.source !== k);
	}

	/** A field worth grouping by: text with 2–15 distinct values, else the first field. */
	function groupField(source: string): string {
		const rows = preview[source]?.rows ?? [];
		const f = fieldsOf(source);
		for (const k of f) {
			const vals = rows.map((r) => r[k]).filter((v) => typeof v === 'string' && v !== '');
			const n = new Set(vals).size;
			if (vals.length >= rows.length / 2 && n >= 2 && n <= 15) return k;
		}
		return f[0] ?? '';
	}

	// ---- widgets ----
	const L = (es: string, en: string) => ({ es, en });
	function addWidget(type: Widget['type']) {
		const source = sourceNames[0] ?? '';
		const f = fieldsOf(source);
		const w: Widget =
			type === 'stat' ? { type, source, agg: 'count', title: L('Total', 'Total'), span: 1 }
			: type === 'bar' ? { type, source, groupBy: groupField(source), agg: 'count', title: L('', ''), span: 2 }
			: type === 'line' ? { type, source, x: f.find((x) => /date|at|time|day/i.test(x)) ?? f[0] ?? '', bucket: 'day', agg: 'count', title: L('', ''), span: 2 }
			: type === 'table' ? { type, source, columns: f.slice(0, 5).map((field) => ({ field })), span: 4, title: L('', '') }
			: { type: 'text', text: L('', ''), span: 4 };
		spec.widgets.push(w);
	}
	function move(i: number, d: number) {
		const j = i + d;
		if (j < 0 || j >= spec.widgets.length) return;
		const [w] = spec.widgets.splice(i, 1);
		spec.widgets.splice(j, 0, w);
	}
	const AGGS: Agg[] = ['count', 'sum', 'avg', 'min', 'max', 'distinct'];
	const FORMATS: Format[] = ['number', 'mxn', 'usd', 'percent', 'date', 'link', 'pill', 'text'];
	const TYPES: { v: Widget['type']; es: string; en: string }[] = [
		{ v: 'stat', es: 'Cifra', en: 'Number' },
		{ v: 'bar', es: 'Barras', en: 'Bars' },
		{ v: 'line', es: 'Línea en el tiempo', en: 'Line over time' },
		{ v: 'table', es: 'Tabla', en: 'Table' },
		{ v: 'text', es: 'Texto', en: 'Text' }
	];
	const typeLabel = (v: string) => tl(TYPES.find((x) => x.v === v) ?? { es: v, en: v });
	const opt = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
	const none = { value: '', label: '—' };
	function cleanTitle(w: Widget) {
		if (w.title && !w.title.es && !w.title.en) delete w.title;
	}

	// ---- JSON ----
	let jsonText = $state('');
	let tab = $state('form');
	$effect(() => {
		if (tab === 'json') jsonText = JSON.stringify($state.snapshot(spec), null, 2);
	});
	function applyJson() {
		try {
			const parsed = JSON.parse(jsonText);
			spec = normalize(parsed);
			tagsText = (parsed.tags ?? []).join(', ');
			slugTouched = true;
			toast.success('OK');
			tab = 'form';
		} catch (e) {
			toast.error(String((e as Error).message));
		}
	}

	// ---- save ----
	const forSave = () => {
		const s = $state.snapshot(spec) as DashboardSpec;
		s.widgets.forEach(cleanTitle);
		if (s.description && !s.description.es && !s.description.en) delete s.description;
		if (!s.note && s.trilium) s.note = s.trilium;
		if (!s.note) delete s.note;
		delete s.trilium;
		if (!s.filters?.length) delete s.filters;
		delete s.updated;
		return s;
	};
	const problems = $derived(validateSpec(forSave()));
	let saving = $state(false);
	async function save() {
		saving = true;
		try {
			const r = await api<{ ok: boolean; slug?: string; problems?: string[] }>('/api/dashboards', { spec: forSave(), previousSlug });
			if (!r.ok) return toast.error(r.problems?.join(' · ') ?? 'Error');
			dirty = false;
			toast.success(t('saved'));
			await goto(`${BASE}/d/${r.slug}`, { invalidateAll: true });
		} finally {
			saving = false;
		}
	}
	async function remove() {
		if (!previousSlug || !confirm(t('confirmDelete'))) return;
		await api('/api/dashboards', { slug: previousSlug }, 'DELETE');
		dirty = false;
		toast.success(t('deleted'));
		await goto(`${BASE}/`, { invalidateAll: true });
	}
	function beforeunload(e: BeforeUnloadEvent) {
		if (dirty) e.preventDefault();
	}
</script>

<svelte:window onbeforeunload={beforeunload} />

{#snippet l10n(label: string, obj: { es: string; en: string }, area = false)}
	<div class="grid gap-1.5">
		<Label class="text-xs">{label}</Label>
		<div class="grid gap-1.5 sm:grid-cols-2">
			{#if area}
				<Textarea bind:value={obj.es} placeholder="ES" rows={2} class="bg-card text-sm" />
				<Textarea bind:value={obj.en} placeholder="EN" rows={2} class="bg-card text-sm" />
			{:else}
				<Input bind:value={obj.es} placeholder="ES" class="h-8 bg-card text-sm" />
				<Input bind:value={obj.en} placeholder="EN" class="h-8 bg-card text-sm" />
			{/if}
		</div>
	</div>
{/snippet}

{#snippet field(label: string, body: import('svelte').Snippet)}
	<div class="grid min-w-0 gap-1"><span class="text-xs text-[var(--text-tertiary)]">{label}</span>{@render body()}</div>
{/snippet}

<div class="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
	<div class="min-w-0">
		<Tabs.Root bind:value={tab}>
			<Tabs.List>
				<Tabs.Trigger value="form">{t('editor')}</Tabs.Trigger>
				<Tabs.Trigger value="json">{t('json')}</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="form" class="mt-3 grid gap-5">
				<section class="grid gap-3 rounded-lg border bg-card p-4">
					<h2 class="label-mono">{t('basics')}</h2>
					{@render l10n(t('name'), spec.title)}
					<div class="grid gap-1.5">
						<Label for="slug" class="text-xs">Slug · /d/…</Label>
						<Input id="slug" bind:value={spec.slug} oninput={() => (slugTouched = true)} class="h-8 bg-card font-mono text-sm" />
					</div>
					{#if spec.description}{@render l10n('Descripción / Description', spec.description, true)}{/if}
					<div class="grid gap-1.5 sm:grid-cols-2">
						<div class="grid gap-1.5">
							<Label for="tags" class="text-xs">{t('tags')}</Label>
							<Input id="tags" bind:value={tagsText} placeholder="ventas, facebook" class="h-8 bg-card text-sm" />
						</div>
						<div class="grid gap-1.5">
							<Label for="tril" class="text-xs">{t('noteField')}</Label>
							<Input id="tril" bind:value={() => spec.note ?? spec.trilium ?? '', (v) => (spec.note = v.trim())} placeholder="id / https://…" class="h-8 bg-card font-mono text-sm" />
						</div>
					</div>
					<label class="flex items-center gap-2 text-sm"><Checkbox bind:checked={() => !!spec.range, (v) => (spec.range = v)} /> {t('range')} (7 / 30 / 90)</label>
				</section>

				<section class="grid gap-3 rounded-lg border bg-card p-4">
					<h2 class="label-mono">{t('sources')}</h2>
					{#each Object.entries(spec.sources) as [k, s] (k)}
						{@const f = files.find((x) => x.file === s.file)}
						<div class="grid gap-2 rounded-md border bg-muted p-3">
							<div class="flex items-center gap-2">
								<Input value={k} onchange={(e) => renameSource(k, e.currentTarget.value)} class="h-8 w-28 bg-card font-mono text-sm" aria-label="source name" />
								<span class="text-xs text-[var(--text-tertiary)]">{preview[k]?.rows.length ?? '…'} {t('rows')}</span>
								<Button variant="ghost" size="icon-sm" class="ml-auto" aria-label={t('delete')} onclick={() => removeSource(k)}><Trash /></Button>
							</div>
							{#if Array.isArray(s.rows)}
								<p class="text-xs text-[var(--text-tertiary)]">inline rows ({s.rows.length}) · JSON</p>
							{:else}
								{#snippet fileSel()}<Pick bind:value={() => s.file ?? '', (v) => { s.file = v; s.path = files.find((x) => x.file === v)?.lists[0]?.path ?? ''; }} options={opt(files.map((x) => x.file))} />{/snippet}
								{@render field('file', fileSel)}
								<div class="grid grid-cols-2 gap-2">
									{#snippet pathSel()}<Pick bind:value={() => s.path ?? '', (v) => (s.path = v)} options={(f?.lists ?? []).map((l) => ({ value: l.path, label: `${l.path || '(root)'} · ${l.count}` }))} />{/snippet}
									{@render field('list', pathSel)}
									{#snippet dateSel()}<Pick bind:value={() => s.dateField ?? '', (v) => (v ? (s.dateField = v) : delete s.dateField)} options={[none, ...opt(fieldsOf(k))]} />{/snippet}
									{@render field('date field', dateSel)}
								</div>
							{/if}
							{#if preview[k]?.error}<p class="text-xs text-bad">{preview[k].error}</p>{/if}
						</div>
					{/each}
					<Button variant="outline" size="sm" onclick={addSource} disabled={!files.length}><Plus /> {t('addSource')}</Button>
				</section>

				<section class="grid gap-3 rounded-lg border bg-card p-4">
					<h2 class="label-mono">{t('filters')}</h2>
					{#each spec.filters ?? [] as fl, i (i)}
						<div class="flex items-center gap-2">
							<Pick class="w-28" bind:value={() => fl.source, (v) => (fl.source = v)} options={opt(sourceNames)} />
							<Pick bind:value={() => fl.field, (v) => (fl.field = v)} options={opt(fieldsOf(fl.source))} />
							<Button variant="ghost" size="icon-sm" aria-label={t('delete')} onclick={() => spec.filters!.splice(i, 1)}><Trash /></Button>
						</div>
					{/each}
					<Button variant="outline" size="sm" disabled={!sourceNames.length} onclick={() => (spec.filters ??= []).push({ source: sourceNames[0], field: fieldsOf(sourceNames[0])[0] ?? '' })}><Plus /> {t('addFilter')}</Button>
				</section>

				<section class="grid gap-3 rounded-lg border bg-card p-4">
					<h2 class="label-mono">{t('widgets')}</h2>
					{#each spec.widgets as w, i (i)}
						{@const fs = fieldsOf(w.source)}
						<div class="grid gap-2 rounded-md border bg-muted p-3">
							<div class="flex items-center gap-1">
								<span class="text-sm font-semibold">{i + 1}. {typeLabel(w.type)}</span>
								<span class="ml-auto flex">
									<Button variant="ghost" size="icon-sm" aria-label="up" disabled={i === 0} onclick={() => move(i, -1)}><ArrowUp /></Button>
									<Button variant="ghost" size="icon-sm" aria-label="down" disabled={i === spec.widgets.length - 1} onclick={() => move(i, 1)}><ArrowDown /></Button>
									<Button variant="ghost" size="icon-sm" aria-label={t('delete')} onclick={() => spec.widgets.splice(i, 1)}><Trash /></Button>
								</span>
							</div>
							{#if w.type !== 'text'}
								{#if w.title}{@render l10n('Título / Title', w.title)}{/if}
							{/if}
							<div class="grid grid-cols-2 gap-2">
								{#if w.type !== 'text'}
									{#snippet srcSel()}<Pick bind:value={() => w.source ?? '', (v) => (w.source = v)} options={opt(sourceNames)} />{/snippet}
									{@render field('source', srcSel)}
								{/if}
								{#snippet spanSel()}<Pick bind:value={() => String(w.span ?? ''), (v) => (w.span = Number(v) as 1 | 2 | 3 | 4)} options={['1', '2', '3', '4'].map((x) => ({ value: x, label: `${x} / 4` }))} />{/snippet}
								{@render field('width', spanSel)}
								{#if w.type === 'stat' || w.type === 'bar' || w.type === 'line'}
									{#snippet aggSel()}<Pick bind:value={() => w.agg, (v) => (w.agg = v as Agg)} options={opt(AGGS)} />{/snippet}
									{@render field('agg', aggSel)}
									{#if w.agg !== 'count'}
										{#snippet fSel()}<Pick bind:value={() => w.field ?? '', (v) => (w.field = v)} options={opt(fs)} />{/snippet}
										{@render field('field', fSel)}
									{/if}
									{#snippet fmtSel()}<Pick bind:value={() => w.format ?? '', (v) => (v ? (w.format = v as Format) : delete w.format)} options={[none, ...opt(['number', 'mxn', 'usd', 'percent'])]} />{/snippet}
									{@render field('format', fmtSel)}
								{/if}
								{#if w.type === 'bar'}
									{#snippet gSel()}<Pick bind:value={() => w.groupBy, (v) => (w.groupBy = v)} options={opt(fs)} />{/snippet}
									{@render field('group by', gSel)}
									{#snippet limSel()}<Input type="number" min="2" max="50" bind:value={() => w.limit ?? 10, (v) => (w.limit = Number(v) || 10)} class="h-8 bg-card text-sm" />{/snippet}
									{@render field('max bars', limSel)}
								{/if}
								{#if w.type === 'line'}
									{#snippet xSel()}<Pick bind:value={() => w.x, (v) => (w.x = v)} options={opt(fs)} />{/snippet}
									{@render field('date (x)', xSel)}
									{#snippet bSel()}<Pick bind:value={() => w.bucket ?? 'day', (v) => (w.bucket = v as 'day')} options={opt(['day', 'week', 'month'])} />{/snippet}
									{@render field('bucket', bSel)}
									{#snippet sSel()}<Pick bind:value={() => w.series ?? '', (v) => (v ? (w.series = v) : delete w.series)} options={[none, ...opt(fs)]} />{/snippet}
									{@render field('series', sSel)}
								{/if}
							</div>
							{#if w.type === 'table'}
								<div class="grid gap-1">
									<span class="text-xs text-[var(--text-tertiary)]">columns</span>
									<div class="flex flex-wrap gap-x-3 gap-y-1">
										{#each fs as fieldName (fieldName)}
											{@const on = w.columns.some((c) => c.field === fieldName)}
											<label class="flex items-center gap-1.5 text-xs">
												<Checkbox checked={on} onCheckedChange={(v) => (w.columns = v ? [...w.columns, { field: fieldName }] : w.columns.filter((c) => c.field !== fieldName))} />
												{fieldName}
											</label>
										{/each}
									</div>
									{#each w.columns as c (c.field)}
										<div class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2">
											<span class="truncate font-mono text-xs">{c.field}</span>
											<Pick bind:value={() => c.format ?? '', (v) => (v ? (c.format = v as Format) : delete c.format)} options={[none, ...opt(FORMATS)]} />
										</div>
									{/each}
									{#snippet sortSel()}<Pick bind:value={() => w.sort ?? '', (v) => (v ? (w.sort = v) : delete w.sort)} options={[none, ...w.columns.flatMap((c) => [{ value: c.field, label: `${c.field} ↑` }, { value: `-${c.field}`, label: `${c.field} ↓` }])]} />{/snippet}
									{@render field('sort', sortSel)}
								</div>
							{/if}
							{#if w.type === 'text'}
								{@render l10n('Texto / Text', w.text, true)}
							{/if}
						</div>
					{/each}
					<div class="flex flex-wrap gap-1.5">
						{#each TYPES as ty (ty.v)}
							<Button variant="outline" size="sm" disabled={ty.v !== 'text' && !sourceNames.length} onclick={() => addWidget(ty.v)}><Plus /> {tl(ty)}</Button>
						{/each}
					</div>
				</section>
			</Tabs.Content>

			<Tabs.Content value="json" class="mt-3 grid gap-2">
				<Textarea bind:value={jsonText} rows={28} spellcheck={false} class="bg-card font-mono text-xs" />
				<Button variant="outline" onclick={applyJson}>{t('apply')}</Button>
			</Tabs.Content>
		</Tabs.Root>

		<div class="sticky bottom-0 z-10 mt-4 grid gap-2 border-t bg-background/95 py-3 backdrop-blur">
			{#if problems.length}
				<div class="flex items-start gap-2 text-xs text-bad">
					<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
					<span><b>{t('problems')}:</b> {problems.slice(0, 4).join(' · ')}{problems.length > 4 ? ' …' : ''}</span>
				</div>
			{/if}
			<div class="flex items-center gap-2">
				<Button onclick={save} disabled={saving || problems.length > 0}>{t('save')}</Button>
				<Button variant="outline" href={previousSlug ? `${BASE}/d/${previousSlug}` : `${BASE}/`}>{t('cancel')}</Button>
				{#if previousSlug}<Button variant="destructive" class="ml-auto" onclick={remove}><Trash /> {t('delete')}</Button>{/if}
			</div>
		</div>
	</div>

	<div class="min-w-0">
		<div class="label-mono mb-2">{t('preview')}</div>
		<div class="rounded-xl border border-dashed p-3 sm:p-4">
			<h2 class="mb-3 text-xl font-extrabold">{tl(spec.title) || '—'}</h2>
			<Dashboard spec={$state.snapshot(spec) as DashboardSpec} data={preview} />
		</div>
	</div>
</div>
