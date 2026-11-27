<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { t } from '#lib/i18n.svelte.js';

	let {
		open = $bindable(false),
		title,
		label,
		hint = '',
		value = '',
		confirm,
		onsubmit
	}: { open?: boolean; title: string; label: string; hint?: string; value?: string; confirm: string; onsubmit: (v: string) => void } = $props();

	let v = $state('');
	$effect(() => {
		if (open) v = value;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
		<form
			class="grid gap-3"
			onsubmit={(e) => {
				e.preventDefault();
				open = false;
				onsubmit(v.trim());
			}}
		>
			<div class="grid gap-1.5">
				<Label for="prompt-input">{label}</Label>
				<Input id="prompt-input" bind:value={v} autocomplete="off" maxlength={200} />
				{#if hint}<p class="text-xs text-muted-foreground">{hint}</p>{/if}
			</div>
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (open = false)}>{t('cancel')}</Button>
				<Button type="submit">{confirm}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
