<!-- src/ui/common/EmptyState.svelte -->
<script lang="ts">
	export let icon: string = '🔍';
	export let title: string = 'No Data Found';
	export let description: string = 'We couldn\'t find any records matching your criteria.';
</script>

<div class="empty-state-container">
	<div class="empty-state-icon">{icon}</div>
	<h4 class="empty-state-title">{title}</h4>
	<p class="empty-state-description">{description}</p>
	<slot />
</div>

<style>
	.empty-state-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--spacing-xxl) var(--spacing-lg);
		color: var(--text-muted);
		border: 1px dashed var(--background-modifier-border);
		border-radius: var(--radius-l);
		background-color: var(--background-secondary-alt);
		max-width: 500px;
		margin: var(--spacing-lg) auto;
	}

	.empty-state-icon {
		font-size: 40px;
		margin-bottom: var(--spacing-sm);
		user-select: none;
	}

	.empty-state-title {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--text-normal);
	}

	.empty-state-description {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		max-width: 360px;
		line-height: 1.4;
	}
</style>
