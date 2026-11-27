<script lang="ts">
	import type { TextWidget } from '#lib/types.js';
	import { tl } from '#lib/i18n.svelte.js';
	let { w }: { w: TextWidget } = $props();
	const paras = $derived(tl(w.text).split(/\n{2,}/).filter(Boolean));
</script>

<div class="grid gap-2 text-sm text-[var(--text-secondary)]">
	{#each paras as p, i (i)}<p class="whitespace-pre-line">{p}</p>{/each}
</div>
