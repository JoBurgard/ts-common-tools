<svelte:options
	customElement={{
		tag: 'mayu-options',
		shadow: 'none',
	}}
/>

<script lang="ts">
	type Props = {
		type: 'checkbox' | 'radio';
		name: string;
		cssClasses?: string;
		options: { label: string; value: string }[];
		value: string[] | string;
	};
	let { type, name, cssClasses, options, value = $bindable() }: Props = $props();
</script>

{#if 'checkbox' === type}
	{#each options as it}
		<label class="label">
			<input
				type="checkbox"
				class={['checkbox', cssClasses]}
				{name}
				bind:group={value}
				value={it.value}
			/>
			{it.label}
		</label>
	{/each}
{/if}
{#if 'radio' === type}
	{#each options as it}
		<label class="label">
			<input
				type="radio"
				class={['radio', cssClasses]}
				{name}
				bind:group={value}
				value={it.value}
			/>
			{it.label}
		</label>
	{/each}
{/if}
