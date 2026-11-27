<script lang="ts">
	import { t, tl } from '#lib/i18n.svelte.js';
	import Brandbar from '#lib/components/Brandbar.svelte';
	import DashboardEditor from '#lib/dash/DashboardEditor.svelte';
	let { data } = $props();
</script>

<svelte:head><title>{t('edit')} · {tl(data.spec.title)} · {data.brand.name}</title></svelte:head>
<div class="mx-auto max-w-[1440px] px-4 pt-5 pb-10 sm:px-6">
	<Brandbar />
	<h1 class="mt-6 mb-4 text-2xl font-extrabold tracking-tight">{t('edit')} · {tl(data.spec.title)}</h1>
	{#key data.spec.slug}<DashboardEditor initial={data.spec} />{/key}
</div>
