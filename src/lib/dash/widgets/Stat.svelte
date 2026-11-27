<script lang="ts">
	import type { Rows, StatWidget } from '#lib/types.js';
	import { aggregate } from '../engine.js';
	import { fmtNum, tl } from '#lib/i18n.svelte.js';
	let { w, rows }: { w: StatWidget; rows: Rows } = $props();
	const value = $derived(aggregate(rows, w.agg, w.field));
</script>

<div class="flex h-full flex-col">
	<div class="text-[1.6rem] sm:text-[2rem] leading-none font-extrabold tracking-tight tabular-nums">{fmtNum(value, w.format)}</div>
	{#if w.hint}<p class="mt-2 text-xs text-[var(--text-tertiary)]">{tl(w.hint)}</p>{/if}
</div>
