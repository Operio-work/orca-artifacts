<script lang="ts">
	import { i18n, setLang } from '#lib/i18n.svelte.js';
</script>

<div class="flex overflow-hidden rounded-full border bg-card" role="group" aria-label="Idioma / Language">
	{#each ['es', 'en'] as const as l (l)}
		<button
			type="button"
			class="px-3 py-1 text-sm font-semibold text-[var(--text-secondary)] aria-pressed:bg-primary aria-pressed:text-primary-foreground"
			aria-pressed={i18n.lang === l}
			onclick={() => setLang(l)}>{l.toUpperCase()}</button
		>
	{/each}
</div>
