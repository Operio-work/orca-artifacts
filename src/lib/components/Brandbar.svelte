<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { t } from '#lib/i18n.svelte.js';
	import { pwa, install, togglePush } from '#lib/pwa.svelte.js';
	import { toast } from 'svelte-sonner';
	import Bell from '@lucide/svelte/icons/bell';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';
	import LangToggle from './LangToggle.svelte';
	import { BASE, withBase } from '#lib/base.js';
	let { actions }: { actions?: Snippet } = $props();
	const brand = $derived(page.data.brand);
	const ios = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches;
	async function bell() {
		if (pwa.push === 'blocked') return void toast.info(t('alertsBlocked'));
		try {
			const s = await togglePush();
			if (s === 'on') toast.success(t('alertsOn'));
			else if (s === 'blocked') toast.info(t('alertsBlocked'));
		} catch {
			toast.error(t('alertsFailed'));
		}
	}
	const bellLabel = $derived(pwa.push === 'on' ? t('alertsTurnOff') : pwa.push === 'blocked' ? t('alertsBlocked') : t('alertsOff'));
</script>

<div class="flex items-center gap-3">
	<a href="{BASE}/" class="flex min-w-0 items-center gap-3">
		<img src={withBase(brand.logo)} alt="" class="size-7 shrink-0" />
		<span class="truncate font-mono text-xs font-semibold tracking-[0.2em] text-[var(--text-secondary)] uppercase">{brand.name}{#if brand.org} · {brand.org}{/if}</span>
	</a>
	<div class="ml-auto flex items-center gap-2">
		{@render actions?.()}
		{#if pwa.push !== 'unsupported'}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="icon-sm" onclick={bell} disabled={pwa.push === 'busy'} aria-label={bellLabel} aria-pressed={pwa.push === 'on'}>
							{#if pwa.push === 'on'}<BellRing />{:else if pwa.push === 'blocked'}<BellOff />{:else}<Bell />{/if}
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>{bellLabel}</Tooltip.Content>
			</Tooltip.Root>
		{:else if ios}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="icon-sm" onclick={() => toast.info(t('alertsIos'))} aria-label={t('alertsIos')}><Bell /></Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>{t('alertsIos')}</Tooltip.Content>
			</Tooltip.Root>
		{/if}
		{#if pwa.canInstall}
			<Button variant="outline" size="sm" onclick={install} aria-label={t('install')}><Download /><span class="hidden sm:inline">{t('install')}</span></Button>
		{/if}
		<LangToggle />
	</div>
</div>
{#if !pwa.online}
	<div role="status" class="mt-3 rounded-md border border-[var(--color-border)] bg-muted px-3 py-2 text-xs text-[var(--text-secondary)]">{t('offline')}</div>
{/if}
