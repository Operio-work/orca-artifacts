<script lang="ts">
	import type { LineWidget, Rows, DashboardSpec } from '#lib/types.js';
	import { timeSeries } from '../engine.js';
	import { fmtNum, loc, t } from '#lib/i18n.svelte.js';
	import { valueLabel } from '../format.js';

	let { w, rows, spec }: { w: LineWidget; rows: Rows; spec: DashboardSpec } = $props();
	const bucket = $derived(w.bucket ?? 'day');
	const series = $derived(timeSeries(rows, w.x, bucket, w.agg, w.field, w.series));
	const n = $derived(series[0]?.points.length ?? 0);

	let width = $state(600);
	const H = 200, padL = 40, padR = 10, padT = 10, padB = 24;
	const iw = $derived(Math.max(10, width - padL - padR));
	const ih = H - padT - padB;
	const maxY = $derived.by(() => {
		const m = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.y)));
		if (m <= 0) return 1;
		const mag = 10 ** Math.floor(Math.log10(m));
		return Math.ceil(m / mag) * mag;
	});
	const xAt = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
	const yAt = (v: number) => padT + ih - (v / maxY) * ih;
	const ticks = $derived([0, 0.5, 1].map((f) => f * maxY));
	const labelX = (x: string) => {
		const d = new Date((x.length === 7 ? x + '-01' : x) + 'T12:00:00');
		return bucket === 'month'
			? d.toLocaleDateString(loc(), { month: 'short', year: '2-digit' })
			: d.toLocaleDateString(loc(), { day: 'numeric', month: 'short' });
	};
	const xTicks = $derived.by(() => {
		if (!n) return [];
		const want = Math.max(2, Math.min(6, Math.floor(iw / 80)));
		const step = Math.max(1, Math.ceil((n - 1) / (want - 1)));
		const out: number[] = [];
		for (let i = 0; i < n; i += step) out.push(i);
		if (out[out.length - 1] !== n - 1 && n - 1 - out[out.length - 1] > step / 2) out.push(n - 1);
		return out;
	});
	const path = (pts: { y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join('');
	const color = (i: number) => `var(--series-${i + 1})`;

	let hover = $state<number | null>(null);
	function move(e: PointerEvent) {
		const r = (e.currentTarget as SVGElement).getBoundingClientRect();
		const x = e.clientX - r.left - padL;
		hover = n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((x / iw) * (n - 1))));
	}
</script>

{#if !n}
	<p class="py-6 text-center text-sm text-[var(--text-tertiary)]">{t('noData')}</p>
{:else}
	{#if series.length > 1}
		<ul class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
			{#each series as s, i (s.key)}
				<li class="flex items-center gap-1.5"><span class="h-0.5 w-3 rounded" style:background={color(i)}></span>{valueLabel(spec, w.series ?? '', s.key)}</li>
			{/each}
		</ul>
	{/if}
	<div class="relative" bind:clientWidth={width}>
		<svg {width} height={H} role="img" aria-label={`${series.length} series, ${n} points`} onpointermove={move} onpointerleave={() => (hover = null)} class="block touch-pan-y">
			{#each ticks as tk (tk)}
				<line x1={padL} x2={padL + iw} y1={yAt(tk)} y2={yAt(tk)} stroke="var(--color-border-dim)" />
				<text x={padL - 6} y={yAt(tk)} dy="0.32em" text-anchor="end" class="fill-[var(--text-tertiary)] font-mono text-[10px]">{fmtNum(tk)}</text>
			{/each}
			{#each xTicks as i (i)}
				<text x={xAt(i)} y={H - 6} text-anchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} class="fill-[var(--text-tertiary)] font-mono text-[10px]">{labelX(series[0].points[i].x)}</text>
			{/each}
			{#if series.length === 1}
				<path d={`${path(series[0].points)}L${xAt(n - 1)},${yAt(0)}L${xAt(0)},${yAt(0)}Z`} fill="var(--series-1)" opacity="0.12" />
			{/if}
			{#each series as s, si (s.key)}
				<path d={path(s.points)} fill="none" stroke={color(si)} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
				{#if n === 1}<circle cx={xAt(0)} cy={yAt(s.points[0].y)} r="4" fill={color(si)} />{/if}
			{/each}
			{#if hover !== null}
				<line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + ih} stroke="var(--text-dim)" stroke-dasharray="2 3" />
				{#each series as s, si (s.key)}
					<circle cx={xAt(hover)} cy={yAt(s.points[hover].y)} r="4" fill={color(si)} stroke="var(--color-surface)" stroke-width="2" />
				{/each}
			{/if}
		</svg>
		{#if hover !== null}
			{@const left = xAt(hover)}
			<div
				class="pointer-events-none absolute top-0 z-10 min-w-28 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-[var(--shadow-card)]"
				style:left={`${left}px`}
				style:transform={left > width / 2 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)'}
			>
				<div class="mb-1 font-semibold">{labelX(series[0].points[hover].x)}{bucket === 'week' ? ' →' : ''}</div>
				{#each series as s, si (s.key)}
					<div class="flex items-center gap-1.5 text-[var(--text-secondary)]">
						<span class="size-2 rounded-full" style:background={color(si)}></span>
						{#if series.length > 1}<span class="truncate">{valueLabel(spec, w.series ?? '', s.key)}</span>{/if}
						<span class="ml-auto font-mono text-[var(--text-primary)] tabular-nums">{fmtNum(s.points[hover].y, w.format)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
