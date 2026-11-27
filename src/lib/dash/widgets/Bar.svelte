<script lang="ts">
	import type { BarWidget, DashboardSpec, Rows } from '#lib/types.js';
	import { groupBy } from '../engine.js';
	import { fmtNum, t } from '#lib/i18n.svelte.js';
	import { valueLabel } from '../format.js';

	let { w, rows, spec, selected = [], ontoggle }: { w: BarWidget; rows: Rows; spec: DashboardSpec; selected?: string[]; ontoggle?: (v: string) => void } = $props();
	const groups = $derived(groupBy(rows, w.groupBy, w.agg, w.field, w.limit ?? 10));
	const max = $derived(Math.max(1, ...groups.map((g) => g.value)));
</script>

{#if !groups.length}
	<p class="py-6 text-center text-sm text-[var(--text-tertiary)]">{t('noData')}</p>
{:else}
	<ul class="grid gap-1.5" role="list">
		{#each groups as g (g.key)}
			{@const label = valueLabel(spec, w.groupBy, g.key)}
			{@const on = selected.includes(g.key)}
			{@const dim = selected.length > 0 && !on}
			<li>
				<button
					type="button"
					class="group grid w-full grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
					disabled={!ontoggle || g.key === '__other__'}
					aria-pressed={on}
					title={`${label}: ${fmtNum(g.value, w.format)}${ontoggle && g.key !== '__other__' ? ' · ' + t('clickToFilter') : ''}`}
					onclick={() => ontoggle?.(g.key)}
				>
					<span class="truncate {dim ? 'text-[var(--text-tertiary)]' : ''}">{label}</span>
					<span class="h-3 overflow-hidden rounded-r-[4px]">
						<span
							class="block h-full rounded-r-[4px] transition-[width,opacity] duration-200"
							style:width={`${Math.max(1.5, (g.value / max) * 100)}%`}
							style:background={g.key === '__other__' ? 'var(--text-dim)' : 'var(--series-1)'}
							style:opacity={dim ? 0.3 : 1}
						></span>
					</span>
					<span class="font-mono text-xs tabular-nums {dim ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}">{fmtNum(g.value, w.format)}</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}
