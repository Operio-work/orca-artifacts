<script lang="ts">
	import type { DashboardSpec, Rows, TableWidget } from '#lib/types.js';
	import { get, sortRows, keyOf } from '../engine.js';
	import { cell } from '../format.js';
	import { t, tl } from '#lib/i18n.svelte.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import Pill from './Pill.svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	let { w, rows, spec }: { w: TableWidget; rows: Rows; spec: DashboardSpec } = $props();
	let sort = $state<string | undefined>(undefined);
	let q = $state('');
	let shown = $state(25);
	const activeSort = $derived(sort ?? w.sort);
	const visible = $derived.by(() => {
		const needle = q.trim().toLowerCase();
		const f = needle ? rows.filter((r) => w.columns.some((c) => keyOf(get(r, c.field)).toLowerCase().includes(needle))) : rows;
		const s = sortRows(f, activeSort);
		return w.limit ? s.slice(0, w.limit) : s;
	});
	function toggle(field: string) {
		sort = activeSort === field ? `-${field}` : activeSort === `-${field}` ? undefined : field;
	}
	const numeric = (c: TableWidget['columns'][number]) => ['number', 'mxn', 'usd', 'percent'].includes(c.format ?? '');
</script>

<div class="mb-2 flex items-center gap-2">
	<Input bind:value={q} placeholder={t('filterTable')} class="h-8 max-w-60 text-sm" type="search" />
	<span class="ml-auto font-mono text-xs text-[var(--text-tertiary)]">{visible.length} {t('rows')}</span>
</div>
<div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr>
				{#each w.columns as c (c.field)}
					{@const s = activeSort === c.field ? 'asc' : activeSort === `-${c.field}` ? 'desc' : null}
					<th class="border-b px-2 py-1.5 text-left whitespace-nowrap {numeric(c) ? 'text-right' : ''}" aria-sort={s === 'asc' ? 'ascending' : s === 'desc' ? 'descending' : 'none'}>
						<button type="button" class="label-mono inline-flex items-center gap-1 hover:text-[var(--text-primary)]" onclick={() => toggle(c.field)}>
							{tl(c.label, c.field)}
							{#if s === 'asc'}<ArrowUp class="size-3" />{:else if s === 'desc'}<ArrowDown class="size-3" />{/if}
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each visible.slice(0, shown) as r, i (i)}
				<tr class="hover:bg-muted">
					{#each w.columns as c (c.field)}
						{@const v = cell(spec, c.field, get(r, c.field), c.format)}
						<td class="border-b border-[var(--color-border-dim)] px-2 py-1.5 align-top {v.num ? 'text-right font-mono tabular-nums' : ''} {c.format === 'link' ? 'max-w-64 truncate' : ''}">
							{#if v.href}<a href={v.href} target="_blank" rel="noopener noreferrer" class="text-ink hover:underline">{v.text}</a>
							{:else if v.pill}<Pill tone={v.pill} text={v.text} />
							{:else}{v.text}{/if}
						</td>
					{/each}
				</tr>
			{:else}
				<tr><td colspan={w.columns.length} class="py-6 text-center text-[var(--text-tertiary)]">{t('noData')}</td></tr>
			{/each}
		</tbody>
	</table>
</div>
{#if visible.length > shown}
	<div class="mt-2 text-center"><Button variant="ghost" size="sm" onclick={() => (shown += 50)}>+ {Math.min(50, visible.length - shown)}</Button></div>
{/if}
