<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { t } from '#lib/i18n.svelte.js';
	import { pwa, install } from '#lib/pwa.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';
	import LangToggle from './LangToggle.svelte';
	let { actions }: { actions?: Snippet } = $props();
	const brand = $derived(page.data.brand);
</script>

<div class="flex items-center gap-3">
	<a href="/" class="flex min-w-0 items-center gap-3">
		<img src={brand.logo} alt="" class="size-7 shrink-0" />
		<span class="truncate font-mono text-xs font-semibold tracking-[0.2em] text-[var(--text-secondary)] uppercase">{brand.name}{#if brand.org} · {brand.org}{/if}</span>
	</a>
	<div class="ml-auto flex items-center gap-2">
		{@render actions?.()}
		{#if pwa.canInstall}
			<Button variant="outline" size="sm" onclick={install} aria-label={t('install')}><Download /><span class="hidden sm:inline">{t('install')}</span></Button>
		{/if}
		<LangToggle />
	</div>
</div>
{#if !pwa.online}
	<div role="status" class="mt-3 rounded-md border border-[var(--color-border)] bg-muted px-3 py-2 text-xs text-[var(--text-secondary)]">{t('offline')}</div>
{/if}
