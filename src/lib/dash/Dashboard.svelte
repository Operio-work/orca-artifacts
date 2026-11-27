<script lang="ts">
	import type { DashboardSpec, Rows, Widget } from '#lib/types.js';
	import { tz } from '#lib/tz.js';
	import { day, distinctValues, get, matches } from './engine.js';
	import { valueLabel } from './format.js';
	import { t, tl } from '#lib/i18n.svelte.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Stat from './widgets/Stat.svelte';
	import Bar from './widgets/Bar.svelte';
	import Line from './widgets/Line.svelte';
	import Table from './widgets/Table.svelte';
	import Text from './widgets/Text.svelte';

	type Resolved = Record<string, { rows: Rows; updated?: string; error?: string }>;
	let { spec, data }: { spec: DashboardSpec; data: Resolved } = $props();

	// active selections: "source|field" -> values (declared filters and bar clicks share this)
	let sel = $state<Record<string, string[]>>({});
	let range = $state<'all' | '7' | '30' | '90'>('all');

	const fk = (source: string, field: string) => `${source}|${field}`;
	const cutoff = $derived.by(() => {
		if (range === 'all') return null;
		const d = new Date();
		d.setDate(d.getDate() - Number(range) + 1);
		return d.toLocaleDateString('en-CA', { timeZone: tz.zone });
	});

	function rowsFor(source: string, except?: string): Rows {
		let rows = data[source]?.rows ?? [];
		const df = spec.sources[source]?.dateField;
		if (cutoff && df) rows = rows.filter((r) => (day(get(r, df)) ?? '') >= cutoff!);
		for (const [k, vals] of Object.entries(sel)) {
			const [s, f] = k.split('|');
			if (s !== source || !vals.length || k === except) continue;
			rows = rows.filter((r) => matches(r, { [f]: vals }));
		}
		return rows;
	}
	// a bar chart ignores its own selection, so the clicked bar stays highlighted among the rest
	const widgetRows = (w: Widget) =>
		w.source ? rowsFor(w.source, w.type === 'bar' ? fk(w.source, w.groupBy) : undefined).filter((r) => matches(r, w.where)) : [];

	function toggle(source: string, field: string, v: string) {
		const k = fk(source, field);
		const cur = sel[k] ?? [];
		sel[k] = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
	}
	// declared filters show their count on the button; bar clicks on other fields get a chip
	const declared = $derived(new Set((spec.filters ?? []).map((f) => fk(f.source, f.field))));
	const chips = $derived(
		Object.entries(sel).flatMap(([k, vals]) => {
			if (declared.has(k)) return [];
			const [s, f] = k.split('|');
			return vals.map((v) => ({ s, f, v }));
		})
	);
	const hasSel = $derived(Object.values(sel).some((v) => v.length));
	const hasRange = $derived(spec.range && Object.values(spec.sources).some((s) => s.dateField));
	const errors = $derived(Object.entries(data).filter(([, d]) => d.error));
	const span = (w: Widget) => w.span ?? (w.type === 'stat' ? 1 : w.type === 'table' ? 4 : 2);
	// phones: numbers sit two per row, everything else takes the full width
	const SPAN: Record<number, string> = { 1: 'col-span-1', 2: 'col-span-2 lg:col-span-2', 3: 'col-span-2 lg:col-span-3', 4: 'col-span-2 lg:col-span-4' };
	const filterLabel = (f: { field: string; label?: { es: string; en: string } }) => tl(f.label, f.field);
</script>

{#if errors.length}
	<div class="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-red-ink)]/30 bg-card p-3 text-sm text-bad">
		<TriangleAlert class="mt-0.5 size-4 shrink-0" />
		<div>{#each errors as [k, d] (k)}<div>{t('errorSource')} <b>{k}</b>: {d.error}</div>{/each}</div>
	</div>
{/if}

{#if spec.filters?.length || hasRange || hasSel}
	<div class="mb-4 flex flex-wrap items-center gap-2">
		{#if hasRange}
			<ToggleGroup.Root type="single" variant="outline" size="sm" bind:value={() => range, (v) => v && (range = v as typeof range)} aria-label={t('range')} class="bg-card">
				<ToggleGroup.Item value="7" class="px-2.5 text-xs">{t('r7')}</ToggleGroup.Item>
				<ToggleGroup.Item value="30" class="px-2.5 text-xs">{t('r30')}</ToggleGroup.Item>
				<ToggleGroup.Item value="90" class="px-2.5 text-xs">{t('r90')}</ToggleGroup.Item>
				<ToggleGroup.Item value="all" class="px-2.5 text-xs">{t('rall')}</ToggleGroup.Item>
			</ToggleGroup.Root>
		{/if}
		{#each spec.filters ?? [] as f (fk(f.source, f.field))}
			{@const k = fk(f.source, f.field)}
			{@const n = sel[k]?.length ?? 0}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="bg-card {n ? 'border-primary' : ''}">
							{filterLabel(f)}{#if n}<span class="rounded-full bg-primary px-1.5 text-[10px] font-bold">{n}</span>{/if}
							<ChevronDown class="size-3.5 opacity-60" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="max-h-80 w-60 overflow-y-auto">
					{#each distinctValues(rowsFor(f.source, k), f.field) as v (v)}
						<DropdownMenu.CheckboxItem checked={sel[k]?.includes(v) ?? false} onCheckedChange={() => toggle(f.source, f.field, v)} closeOnSelect={false}>
							<span class="truncate">{valueLabel(spec, f.field, v)}</span>
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/each}
		{#each chips as c (c.s + c.f + c.v)}
			<button type="button" class="inline-flex items-center gap-1 rounded-full border border-primary bg-accent px-2.5 py-1 text-xs" onclick={() => toggle(c.s, c.f, c.v)}>
				<span class="text-[var(--text-tertiary)]">{c.f}:</span> {valueLabel(spec, c.f, c.v)} <X class="size-3" />
			</button>
		{/each}
		{#if hasSel || range !== 'all'}
			<Button variant="link" size="xs" class="text-ink" onclick={() => { sel = {}; range = 'all'; }}>{t('clear')}</Button>
		{/if}
	</div>
{/if}

<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
	{#each spec.widgets as w, i (w.id ?? i)}
		{@const rows = widgetRows(w)}
		<section class="min-w-0 rounded-lg border bg-card p-4 shadow-[var(--shadow-sm)] {SPAN[span(w)]}">
			{#if w.title}<h3 class="label-mono mb-3">{tl(w.title)}</h3>{/if}
			{#if w.type === 'stat'}<Stat {w} {rows} />
			{:else if w.type === 'bar'}<Bar {w} {rows} {spec} selected={sel[fk(w.source!, w.groupBy)] ?? []} ontoggle={(v) => toggle(w.source!, w.groupBy, v)} />
			{:else if w.type === 'line'}<Line {w} {rows} {spec} />
			{:else if w.type === 'table'}<Table {w} {rows} {spec} />
			{:else if w.type === 'text'}<Text {w} />{/if}
		</section>
	{/each}
</div>
