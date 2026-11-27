<script lang="ts">
	import { pillTone } from '../format.js';
	let { tone, text }: { tone: string; text: string } = $props();
	const cls = $derived(
		{
			ok: 'text-ok bg-[color-mix(in_srgb,var(--color-green)_12%,var(--color-surface))]',
			bad: 'text-bad bg-[color-mix(in_srgb,var(--color-red)_12%,var(--color-surface))]',
			warn: 'text-warn bg-[color-mix(in_srgb,var(--color-yellow)_14%,var(--color-surface))]',
			neutral: 'text-[var(--text-secondary)] bg-muted'
		}[pillTone(tone)]
	);
</script>

<span class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap {cls}">{text}</span>
