<!-- src/ui/common/SkeletonLoader.svelte -->
<script lang="ts">
	export let type: 'kpi' | 'table' | 'list' = 'list';
	export let rows: number = 5;
</script>

<div class="skeleton-container skeleton-pulsing">
	{#if type === 'kpi'}
		<div class="skeleton-kpi-grid">
			{#each Array(4) as _}
				<div class="skeleton-card">
					<div class="skeleton-line header"></div>
					<div class="skeleton-line value"></div>
					<div class="skeleton-line footer"></div>
				</div>
			{/each}
		</div>
	{:else if type === 'table'}
		<div class="skeleton-table">
			<div class="skeleton-table-header">
				<div class="skeleton-line col"></div>
				<div class="skeleton-line col"></div>
				<div class="skeleton-line col"></div>
				<div class="skeleton-line col"></div>
			</div>
			{#each Array(rows) as _}
				<div class="skeleton-table-row">
					<div class="skeleton-line col"></div>
					<div class="skeleton-line col"></div>
					<div class="skeleton-line col"></div>
					<div class="skeleton-line col"></div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="skeleton-list">
			{#each Array(rows) as _, i}
				<div class="skeleton-list-item" style="--indent: {i % 3 * 16}px">
					<div class="skeleton-circle"></div>
					<div class="skeleton-line text"></div>
					<div class="skeleton-line amount"></div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.skeleton-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md) 0;
	}

	.skeleton-pulsing .skeleton-line,
	.skeleton-pulsing .skeleton-circle {
		animation: pulse 1.5s ease-in-out infinite;
		background: var(--background-secondary-alt);
		border-radius: var(--radius-s);
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 1; background: var(--background-modifier-hover); }
	}

	/* KPI layout */
	.skeleton-kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-lg);
	}

	.skeleton-card {
		padding: var(--spacing-lg);
		background-color: var(--background-secondary);
		border-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.skeleton-line.header { height: 14px; width: 40%; }
	.skeleton-line.value { height: 28px; width: 65%; margin: var(--spacing-xs) 0; }
	.skeleton-line.footer { height: 12px; width: 80%; }

	/* Table layout */
	.skeleton-table {
		width: 100%;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		overflow: hidden;
	}

	.skeleton-table-header {
		display: flex;
		background-color: var(--background-secondary);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--background-modifier-border);
		gap: var(--spacing-lg);
	}

	.skeleton-table-row {
		display: flex;
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--background-secondary);
		gap: var(--spacing-lg);
	}

	.skeleton-table-row:last-child {
		border-bottom: none;
	}

	.skeleton-line.col {
		height: 14px;
		flex: 1;
	}

	.skeleton-line.col:nth-child(1) { flex: 1.5; }
	.skeleton-line.col:nth-child(2) { flex: 2; }
	.skeleton-line.col:nth-child(3) { flex: 3; }
	.skeleton-line.col:nth-child(4) { flex: 1.5; text-align: right; }

	/* List layout */
	.skeleton-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.skeleton-list-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) 0;
		padding-left: var(--indent, 0px);
	}

	.skeleton-circle {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.skeleton-line.text {
		height: 14px;
		width: 50%;
	}

	.skeleton-line.amount {
		height: 14px;
		width: 80px;
		margin-left: auto;
	}
</style>
