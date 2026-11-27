<script lang="ts">
	import * as Select from '#lib/components/ui/select/index.js';
	let {
		value = $bindable(''),
		options,
		placeholder = '—',
		id,
		class: cls = ''
	}: { value?: string; options: (string | { value: string; label: string })[]; placeholder?: string; id?: string; class?: string } = $props();
	const opts = $derived(options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
	const current = $derived(opts.find((o) => o.value === value)?.label);
</script>

<Select.Root type="single" bind:value>
	<Select.Trigger {id} class="h-8 w-full min-w-0 bg-card text-sm {cls}">
		<span class="truncate {current ? '' : 'text-muted-foreground'}">{current ?? (value || placeholder)}</span>
	</Select.Trigger>
	<Select.Content class="max-h-72">
		{#each opts as o (o.value)}
			<Select.Item value={o.value} label={o.label}>{o.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
