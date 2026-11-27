<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { i18n } from '#lib/i18n.svelte.js';
	import { tz } from '#lib/tz.js';
	import { initPwa } from '#lib/pwa.svelte.js';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	let { data, children } = $props();
	// svelte-ignore state_referenced_locally
	i18n.lang = data.lang;
	// svelte-ignore state_referenced_locally
	tz.zone = data.brand.timeZone;
	onMount(initPwa);
	// Drafts waiting for approval show as a number on the installed app's icon.
	$effect(() => {
		const n = data.drafts;
		const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
		(n ? nav.setAppBadge?.(n) : nav.clearAppBadge?.())?.catch(() => {});
	});
</script>

<svelte:head>
	<link rel="icon" href={data.brand.logo} />
	{#if data.brand.theme}<link rel="stylesheet" href={data.brand.theme} />{/if}
</svelte:head>

<Tooltip.Provider delayDuration={300}>
	{@render children()}
</Tooltip.Provider>
<Toaster position="bottom-center" />
