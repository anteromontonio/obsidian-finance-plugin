<!-- src/ui/common/ErrorBanner.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let message: string = 'An error occurred while loading data.';
	export let title: string = 'Error Loading Data';

	const dispatch = createEventDispatcher();

	function handleRetry() {
		dispatch('retry');
	}
</script>

<div class="error-banner-container">
	<div class="error-banner-icon">
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10"/>
			<line x1="12" y1="8" x2="12" y2="12"/>
			<line x1="12" y1="16" x2="12.01" y2="16"/>
		</svg>
	</div>
	<div class="error-banner-content">
		<h4 class="error-banner-title">{title}</h4>
		<p class="error-banner-message">{message}</p>
	</div>
	<button class="error-banner-retry-btn" on:click={handleRetry}>
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="retry-icon">
			<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
		</svg>
		Retry
	</button>
</div>

<style>
	.error-banner-container {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-lg);
		background-color: var(--background-secondary-alt);
		border-left: 4px solid var(--color-error);
		border-radius: var(--radius-m);
		margin: var(--spacing-md) 0;
	}

	.error-banner-icon {
		color: var(--color-error);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.error-banner-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.error-banner-title {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--text-normal);
	}

	.error-banner-message {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.error-banner-retry-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--size-4-1) var(--size-4-3);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-s);
		background-color: var(--interactive-normal);
		color: var(--text-normal);
		cursor: pointer;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		transition: background-color var(--transition-normal);
		white-space: nowrap;
	}

	.error-banner-retry-btn:hover {
		background-color: var(--interactive-hover);
	}

	.retry-icon {
		transition: transform 0.3s ease;
	}

	.error-banner-retry-btn:hover .retry-icon {
		transform: rotate(180deg);
	}
</style>
