<script lang="ts">
	import type { Kind } from '#lib/types.js';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Activity from '@lucide/svelte/icons/activity';
	import Archive from '@lucide/svelte/icons/archive';
	let { kind, class: cls = 'size-4' }: { kind: Kind; class?: string } = $props();
</script>

{#if kind === 'dashboard'}<LayoutDashboard class={cls} />{:else if kind === 'page'}<Activity class={cls} />{:else}<Archive class={cls} />{/if}
