<script lang="ts">
	import CardComponent from '../../common/CardComponent.svelte';
	import IndicatorsSection from './IndicatorsSection.svelte';
	import SkeletonLoader from '../../common/SkeletonLoader.svelte';
	import ErrorBanner from '../../common/ErrorBanner.svelte';
	import type { OverviewController } from '../../../controllers/OverviewController';
	import { writable, type Writable } from 'svelte/store'; // Import writable
	import type { OverviewState } from '../../../controllers/OverviewController'; // Import the State type
	import { AddBudgetModal } from '../../modals/AddBudgetModal';
	import { AddTargetModal } from '../../modals/AddTargetModal';

	// --- Receive the controller ---
	export let controller: OverviewController;
	export let plugin: any = null;

	// --- THIS IS THE FIX ---
	// 1. Create a local, placeholder store with default values.
	//    This ensures $stateStore is always a valid store.
	const placeholderState: Writable<OverviewState> = writable({
		isLoading: true,
		error: null,
		netWorth: '0.00 USD',
		monthlyIncome: '0.00 USD',
		monthlyExpenses: '0.00 USD',
		savingsRate: '0%',
		currency: 'USD',
	});

	// 2. Use a reactive statement ($:) to update the local store variable
	//    *after* the 'controller' prop is passed in.
	$: stateStore = controller ? controller.state : placeholderState;
	
	// 3. Now, '$stateStore' will safely subscribe, starting with the
	//    placeholder and then automatically switching to the real store.
	$: state = $stateStore;
	
	// Add refresh functionality
	function handleRefresh() {
		if (controller) {
			controller.loadData();
		}
	}

	function handleAddBudget() {
		if (!plugin) return;
		new AddBudgetModal(plugin.app, plugin).open();
	}

	function handleAddTarget() {
		if (!plugin) return;
		new AddTargetModal(plugin.app, plugin).open();
	}
	// -----------------------
</script>
<div class="beancount-overview">
	<div class="overview-header">
		<h3>Financial Overview</h3>
		<button class="btn btn-primary" on:click={handleRefresh} disabled={state.isLoading}>Refresh</button>
	</div>

	{#if state.isLoading}
		<SkeletonLoader type="kpi" />
	{:else if state.error}
		<ErrorBanner message={state.error} on:retry={handleRefresh} />
	{:else}
		<div class="conversion-warning">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
				<line x1="12" y1="9" x2="12" y2="13"/>
				<line x1="12" y1="17" x2="12.01" y2="17"/>
			</svg>
			<span>Only commodities with conversion prices to {state.currency} are included in Net Worth calculations</span>
		</div>
		
		<div class="kpi-grid">
			<CardComponent label="Total Balance" value={state.netWorth} comparison="Assets minus liabilities" />
			<CardComponent label="Monthly Income" value={state.monthlyIncome} comparison="Current month earnings" />
			<CardComponent label="Monthly Expenses" value={state.monthlyExpenses} comparison="Current month spending" />
			<CardComponent label="Savings Rate" value={state.savingsRate} comparison="Income minus expenses" />
		</div>

		<IndicatorsSection
			{plugin}
			on:add-budget={handleAddBudget}
			on:add-target={handleAddTarget}
		/>
	{/if}
</div>

<style>
	/* Styles remain unchanged */
	.beancount-overview { padding: 0; }
	
	.overview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--size-4-4);
		padding-bottom: var(--size-4-2);
		border-bottom: 1px solid var(--background-modifier-border);
	}
	
	.overview-header h3 {
		margin: 0;
		color: var(--text-normal);
		font-size: var(--font-ui-larger);
	}
	
	.btn {
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		border: 1px solid var(--background-modifier-border);
		background: var(--interactive-normal);
		color: var(--text-normal);
		cursor: pointer;
		font-size: 0.9rem;
	}

	.btn:hover {
		background: var(--interactive-hover);
	}

	.btn-primary {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		border-color: var(--interactive-accent);
	}

	.btn-primary:hover {
		background: var(--interactive-accent-hover);
	}
	
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--size-4-4);
	}
	
	.conversion-warning {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: var(--size-4-2) var(--size-4-3);
		margin-bottom: var(--size-4-4);
		background: var(--background-modifier-info);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-s);
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}
	
	.conversion-warning svg {
		flex-shrink: 0;
		opacity: 0.7;
	}
	
	.error-message { color: var(--text-error); }
</style>