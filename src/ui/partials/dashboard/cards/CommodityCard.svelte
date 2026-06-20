<!-- src/ui/partials/dashboard/cards/CommodityCard.svelte -->
<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { CommodityInfo } from "../../../../controllers/CommoditiesController";

	export let commodity: CommodityInfo;
	export let index: number = 0;
	export let operatingCurrency: string = 'USD';

	function formatValue(n: number): string {
		if (!n) return '0.00';
		if (n >= 10_000_000) return (n / 1_000_000).toFixed(2) + 'M';
		return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	const dispatch = createEventDispatcher();

	function handleClick() {
		dispatch("click", { commodity });
	}

	function handleLogoError(e: Event) {
		const target = e.target as HTMLImageElement;
		if (target) {
			target.style.display = "none";
		}
	}

	// Helper to get initials from symbol
	function getInitials(symbol: string): string {
		if (!symbol) return "?";
		return symbol.slice(0, 2).toUpperCase();
	}

	// Helper to generate a consistent color based on symbol
	function getSymbolColor(symbol: string): string {
		if (!symbol) return "var(--background-modifier-border)";
		let hash = 0;
		for (let i = 0; i < symbol.length; i++) {
			hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
		}
		const colors = [
			"#3b82f6", // blue
			"#10b981", // emerald
			"#f59e0b", // amber
			"#ef4444", // red
			"#8b5cf6", // violet
			"#ec4899", // pink
			"#06b6d4", // cyan
			"#f97316", // orange
		];
		return colors[Math.abs(hash) % colors.length];
	}

	// Helper to format the price date
	function formatStatusTime(dateStr: string | null | undefined): string {
		if (!dateStr) return "No data";

		try {
			const date = new Date(dateStr);
			const now = new Date();
			// Strip time for day comparison
			const d1 = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
			);
			const d2 = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
			);
			const diffMs = d2.getTime() - d1.getTime();
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

			if (diffDays === 0) return "Today";
			if (diffDays === 1) return "Yesterday";
			if (diffDays < 7) return `${diffDays}d ago`;
			return date.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			});
		} catch (e) {
			return dateStr;
		}
	}

	$: displayName = commodity?.displayName || commodity?.metadata?.name || "";
	$: ariaLabel = displayName
		? `View details for ${commodity?.symbol || `UNKNOWN_${index}`} (${displayName})`
		: `View details for ${commodity?.symbol || `UNKNOWN_${index}`}`;
</script>

<div class="commodity-card-wrapper" class:is-operating={commodity?.isOperatingCurrency}>
	<button
		class="commodity-card"
		on:click={handleClick}
		aria-label={ariaLabel}
		type="button"
	>
		<div class="card-header">
			<div class="identity">
				<div class="logo-box">
					{#if commodity?.logoUrl}
						<img
							src={commodity.logoUrl}
							alt={commodity.symbol}
							class="logo-img"
							on:error={handleLogoError}
						/>
					{:else}
						<div class="initials-fallback">
							{getInitials(commodity?.symbol)}
						</div>
					{/if}
				</div>
				<div class="name-box">
					<span class="symbol-text"
						>{commodity?.symbol || `UNKNOWN_${index}`}</span
					>
				</div>
			</div>

			{#if commodity?.currentPrice}
				<div
					class="status-pill {commodity?.isPriceLatest
						? 'live'
						: 'stale'}"
				>
					<span class="status-dot"></span>
					<span class="status-label">
						{commodity?.isPriceLatest
							? "LIVE"
							: formatStatusTime(commodity?.priceDate)}
					</span>
				</div>
			{/if}
		</div>

		<div class="card-body">
			<!-- Value (primary) -->
			{#if (commodity?.valueInOperatingCurrency ?? 0) > 0}
				<div class="value-container">
					<span class="value-main">{formatValue(commodity.valueInOperatingCurrency ?? 0)}</span>
					<span class="value-currency">{operatingCurrency}</span>
				</div>
			{:else if commodity?.holdingsRaw && !commodity?.isOperatingCurrency}
				<!-- Has holdings but no price to convert — show raw units -->
				<div class="value-container">
					<span class="value-main no-price">{commodity.holdingsRaw.split(' ')[0]}</span>
					<span class="value-currency">{commodity.symbol}</span>
				</div>
			{:else}
				<div class="value-container">
					<span class="value-main no-price">0.00</span>
					<span class="value-currency">{operatingCurrency}</span>
				</div>
			{/if}

			{#if displayName}
				<div class="card-display-name">{displayName}</div>
			{/if}

			{#if commodity?.isOperatingCurrency}
				<!-- Filler block — keeps card height consistent with non-operating cards -->
				<div class="op-currency-note">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="op-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<span>Base currency for all conversions in this ledger</span>
				</div>
			{:else}
				<!-- Price row -->
				<div class="data-row">
					<span class="data-label">Price</span>
					{#if commodity?.currentPrice}
						<span class="data-value">{commodity.currentPrice}</span>
					{:else}
						<span class="data-value unavailable">No price available</span>
					{/if}
				</div>

				<!-- Holdings row -->
				<div class="data-row">
					<span class="data-label">Holdings</span>
					{#if commodity?.holdingsRaw}
						<span class="data-value">{commodity.holdingsRaw}</span>
					{:else}
						<span class="data-value unavailable">0 {commodity?.symbol}</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="card-footer">
			<span class="details-text">View Details</span>
			<div class="arrow-box">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="5" y1="12" x2="19" y2="12"></line>
					<polyline points="12 5 19 12 12 19"></polyline>
				</svg>
			</div>
		</div>
	</button>
</div>

<style>
	.commodity-card-wrapper {
		background: var(--background-secondary);
		border: 1px solid var(--background-modifier-border-hover);
		border-radius: 6px;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.commodity-card-wrapper:hover {
		border-color: var(--interactive-accent);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.commodity-card-wrapper::after {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 3px;
		background: var(--interactive-accent);
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.commodity-card-wrapper:hover::after {
		opacity: 1;
	}

	.commodity-card {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: var(--size-4-3);
		gap: var(--size-4-3);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		color: inherit;
		font-family: inherit;
	}

	.commodity-card:focus-visible {
		outline: 2px solid var(--interactive-accent);
		outline-offset: -2px;
	}

	/* HEADER SECTION */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		width: 100%;
	}

	.identity {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.logo-box {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--background-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 1px solid var(--background-modifier-border-hover);
		flex-shrink: 0;
	}

	.logo-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		background: white;
		padding: 2px;
	}

	.initials-fallback {
		font-weight: 800;
		font-size: 14px;
		color: var(--text-muted);
		background: var(--background-secondary);
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		letter-spacing: -0.5px;
	}

	.symbol-text {
		display: block;
		font-weight: 700;
		font-size: 15px;
		color: var(--text-normal);
		letter-spacing: 0.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.name-box {
		min-width: 0;
	}

	.display-name-text {
		display: block;
		margin-top: 2px;
		color: var(--text-muted);
		font-size: 12px;
		font-weight: 500;
		line-height: 1.25;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-display-name {
		color: var(--text-muted);
		font-size: 12px;
		font-weight: 500;
		line-height: 1.35;
		margin: -1px 0 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* STATUS PILL */
	.status-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 20px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.status-pill.live {
		background: color-mix(in srgb, var(--text-success), transparent 85%);
		color: var(--text-success);
		border: 1px solid
			color-mix(in srgb, var(--text-success), transparent 70%);
	}

	.status-pill.stale {
		background: color-mix(in srgb, var(--text-warning), transparent 85%);
		color: var(--text-warning);
		border: 1px solid
			color-mix(in srgb, var(--text-warning), transparent 70%);
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	.live .status-dot {
		box-shadow: 0 0 6px var(--text-success);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.2);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* BODY SECTION */
	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* Total value — primary display */
	.value-container {
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin-bottom: 6px;
	}

	.value-main {
		font-size: 22px;
		font-weight: 700;
		color: var(--text-accent);
		letter-spacing: -0.5px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.value-main.no-price {
		color: var(--text-muted);
		font-size: 18px;
	}

	.value-currency {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.no-price-state {
		margin-bottom: 6px;
	}

	.no-price-text {
		color: var(--text-muted);
		font-style: italic;
		font-size: 12px;
	}

	/* Price + Holdings rows */
	.data-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		padding: 6px 0;
		border-top: 1px dashed var(--background-modifier-border-hover);
		font-size: 11px;
		line-height: 1.2;
	}

	/* Operating-currency info block — fills the space of the two data rows */
	.op-currency-note {
		display: flex;
		align-items: flex-start;
		gap: 7px;
		padding: 10px 12px;
		border-top: 1px dashed var(--background-modifier-border-hover);
		background: color-mix(in srgb, var(--interactive-accent), transparent 92%);
		border-radius: 8px;
		color: var(--text-accent);
		font-size: 11px;
		font-style: italic;
		line-height: 1.4;
	}

	.op-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		margin-top: 1px;
		opacity: 0.75;
	}

	.data-label {
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.data-value {
		color: var(--text-normal);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		min-width: 0;
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.data-value.unavailable {
		color: var(--text-faint);
		font-weight: 400;
		font-style: italic;
	}

	/* FOOTER SECTION */
	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: var(--size-4-2);
		border-top: 1px solid var(--background-modifier-border-hover);
		color: var(--text-muted);
		transition: all 0.2s ease;
	}

	.details-text {
		font-size: 11px;
		font-weight: 600;
	}

	.arrow-box {
		width: 20px;
		height: 20px;
		transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.arrow-box svg {
		width: 100%;
		height: 100%;
	}

	.commodity-card:hover .card-footer {
		color: var(--interactive-accent);
	}

	.commodity-card:hover .arrow-box {
		transform: translateX(6px);
	}

	/* OPERATING-CURRENCY HIGHLIGHT */
	.commodity-card-wrapper.is-operating {
		border-color: var(--interactive-accent);
		box-shadow: 0 0 0 1px var(--interactive-accent),
			0 4px 14px rgba(0, 0, 0, 0.05);
	}
	.commodity-card-wrapper.is-operating::after {
		opacity: 1;
	}

	.commodity-card-wrapper.is-operating .value-container {
		justify-content: center;
	}

	.operating-badge {
		display: inline-block;
		margin-left: 8px;
		padding: 2px 7px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-on-accent);
		background: var(--interactive-accent);
		border-radius: 999px;
		vertical-align: middle;
	}


</style>
