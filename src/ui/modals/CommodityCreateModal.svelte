<!-- src/ui/modals/CommodityCreateModal.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    // Form state
    let symbol: string = '';
    let date: string = new Date().toISOString().split('T')[0]; // Today's date
    let priceMetadata: string = '';
    let logoUrl: string = '';

    // UI state
    let symbolError: string = '';
    let testingPrice: boolean = false;
    let testingLogo: boolean = false;
    let priceTestResult: string = '';
    let logoTestResult: string = '';
    let logoPreview: string = '';

    // Validation
    function validateSymbol(value: string): boolean {
        if (!value) {
            symbolError = 'Symbol is required';
            return false;
        }
        if (!/^[A-Z0-9._-]+$/i.test(value)) {
            symbolError = 'Use alphanumeric characters, dots, underscores, or hyphens';
            return false;
        }
        symbolError = '';
        return true;
    }

    function handleSymbolInput(e: Event) {
        const target = e.target as HTMLInputElement;
        symbol = target.value.toUpperCase();
        validateSymbol(symbol);
    }

    function handleLogoInput(e: Event) {
        const target = e.target as HTMLInputElement;
        logoUrl = target.value;
        logoPreview = logoUrl; // Update preview
    }

    function handleLogoError() {
        logoPreview = ''; // Hide broken image
    }

    async function testPrice() {
        if (!priceMetadata.trim()) {
            priceTestResult = 'Please enter a price source';
            return;
        }
        
        testingPrice = true;
        priceTestResult = 'Testing...';
        
        try {
            dispatch('test-price', { symbol, priceMetadata });
            // Result will be handled by parent
        } catch (error) {
            priceTestResult = 'Test failed';
        } finally {
            testingPrice = false;
        }
    }

    async function testLogo() {
        if (!logoUrl.trim()) {
            logoTestResult = 'Please enter a logo URL';
            return;
        }
        
        testingLogo = true;
        logoTestResult = 'Testing...';
        
        try {
            dispatch('test-logo', { symbol, url: logoUrl });
            // Result will be handled by parent
        } catch (error) {
            logoTestResult = 'Test failed';
        } finally {
            testingLogo = false;
        }
    }

    function handleSave() {
        if (!validateSymbol(symbol)) {
            return;
        }
        
        dispatch('save', {
            symbol: symbol.toUpperCase(),
            date,
            priceMetadata: priceMetadata.trim() || undefined,
            logoUrl: logoUrl.trim() || undefined
        });
    }

    function handleCancel() {
        dispatch('cancel');
    }
</script>

<div class="commodity-create-modal">
    <h2>Add New Commodity</h2>

    <div class="form-grid">
        <div class="form-group">
            <label for="symbol">
                Symbol <span class="required">*</span>
            </label>
            <input
                id="symbol"
                type="text"
                bind:value={symbol}
                on:input={handleSymbolInput}
                placeholder="BTC, AAPL, USD..."
                class:error={symbolError}
                required
            />
            {#if symbolError}
                <div class="error-message">{symbolError}</div>
            {/if}
            <div class="hint">Uppercase alphanumeric recommended (e.g., BTC, AAPL)</div>
        </div>

        <div class="form-group">
            <label for="date">
                Date <span class="required">*</span>
            </label>
            <input
                id="date"
                type="date"
                bind:value={date}
                required
            />
            <div class="hint">Date when the commodity was first introduced</div>
        </div>

        <div class="form-group full-width">
            <label for="priceMetadata">
                Price Source <span class="optional">(optional)</span>
            </label>
            <div class="input-with-button">
                <input
                    id="priceMetadata"
                    type="text"
                    bind:value={priceMetadata}
                    placeholder="yahoo/AAPL, USD, coinbase/BTC-USD..."
                />
                <button
                    on:click={testPrice}
                    disabled={testingPrice || !priceMetadata.trim()}
                    class="test-button"
                >
                    {testingPrice ? '⏳' : '🧪'} Test
                </button>
            </div>
            {#if priceTestResult}
                <div class="test-result">{priceTestResult}</div>
            {/if}
            <div class="hint">Price source for automated price fetching (e.g., yahoo/AAPL)</div>
        </div>

        <div class="form-group full-width">
            <label for="logoUrl">
                Logo URL <span class="optional">(optional)</span>
            </label>
            <div class="input-with-button">
                <input
                    id="logoUrl"
                    type="url"
                    bind:value={logoUrl}
                    on:input={handleLogoInput}
                    placeholder="https://logos.hunter.io/bitcoin.org"
                />
                <button
                    on:click={testLogo}
                    disabled={testingLogo || !logoUrl.trim()}
                    class="test-button"
                >
                    {testingLogo ? '⏳' : '🧪'} Test
                </button>
            </div>
            {#if logoTestResult}
                <div class="test-result">{logoTestResult}</div>
            {/if}
            {#if logoPreview}
                <div class="logo-preview">
                    <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        on:error={handleLogoError}
                    />
                </div>
            {/if}
            <div class="hint">URL to commodity logo image (will be displayed in UI)</div>
        </div>
    </div>

    <div class="modal-footer">
        <button on:click={handleCancel} class="cancel-button">
            Cancel
        </button>
        <button 
            on:click={handleSave} 
            class="save-button"
            disabled={!symbol || !!symbolError}
        >
            Create Commodity
        </button>
    </div>
</div>

<style>
    .commodity-create-modal {
        padding: var(--size-4-4);
        max-width: 600px;
    }

    h2 {
        margin: 0 0 var(--size-4-4) 0;
        color: var(--text-normal);
        font-size: var(--font-ui-larger);
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--size-4-2);
        margin-bottom: var(--size-4-3);
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--size-4-1);
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    label {
        display: block;
        font-weight: 500;
        color: var(--text-normal);
        font-size: var(--font-ui-small);
    }

    .required {
        color: var(--text-error);
    }

    .optional {
        color: var(--text-muted);
        font-weight: normal;
        font-size: 0.9em;
    }

    input[type="text"],
    input[type="date"],
    input[type="url"] {
        width: 100%;
        padding: var(--size-4-1) var(--size-4-2);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: var(--font-ui-small);
        font-family: inherit;
    }

    input.error {
        border-color: var(--text-error);
    }

    .error-message {
        margin-top: 4px;
        color: var(--text-error);
        font-size: 0.85em;
    }

    .hint {
        margin-top: 4px;
        font-size: 0.85em;
        color: var(--text-muted);
    }

    .input-with-button {
        display: flex;
        gap: var(--size-4-2);
    }

    .input-with-button input {
        flex: 1;
    }

    .test-button {
        padding: var(--size-4-1) var(--size-4-3);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        background: var(--background-primary);
        color: var(--text-normal);
        cursor: pointer;
        font-size: var(--font-ui-small);
        white-space: nowrap;
    }

    .test-button:hover:not(:disabled) {
        background: var(--background-modifier-hover);
    }

    .test-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .test-result {
        margin-top: 4px;
        font-size: 0.85em;
        color: var(--text-muted);
    }

    .logo-preview {
        margin-top: var(--size-4-2);
        padding: var(--size-4-2);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        background: var(--background-secondary);
        text-align: center;
    }

    .logo-preview img {
        max-width: 100px;
        max-height: 100px;
        object-fit: contain;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--size-4-2);
        margin-top: var(--size-4-4);
        padding-top: var(--size-4-3);
        border-top: 1px solid var(--background-modifier-border);
    }

    button {
        padding: var(--size-4-1) var(--size-4-4);
        border: none;
        border-radius: var(--radius-s);
        font-size: var(--font-ui-small);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .cancel-button {
        background: var(--background-secondary);
        color: var(--text-normal);
    }

    .cancel-button:hover {
        background: var(--background-modifier-hover);
    }

    .save-button {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }

    .save-button:hover:not(:disabled) {
        background: var(--interactive-accent-hover);
    }

    .save-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
