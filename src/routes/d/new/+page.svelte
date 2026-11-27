<script lang="ts">
	import { t } from '#lib/i18n.svelte.js';
	import { page } from '$app/state';
	import Brandbar from '#lib/components/Brandbar.svelte';
	import DashboardEditor from '#lib/dash/DashboardEditor.svelte';
</script>

<svelte:head><title>{t('newDashboard')} · {page.data.brand.name}</title></svelte:head>
<div class="mx-auto max-w-[1440px] px-4 pt-5 pb-10 sm:px-6">
	<Brandbar />
	<h1 class="mt-6 mb-4 text-2xl font-extrabold tracking-tight">{t('newDashboard')}</h1>
	<DashboardEditor />
</div>
