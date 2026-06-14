<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { JournalTransaction } from '../../../../models/journal';

    export let entry: JournalTransaction;

    const dispatch = createEventDispatcher();

    function formatAmount(amount: string | null, currency: string | null) {
        if (!amount) return '';
        return `${amount} ${currency || ''}`;
    }
</script>

<div class="card transaction-card">
    <div class="card-header">
        <div class="header-left">
            <span class="badge badge-transaction">
                <span class="icon">💰</span> TRANSACTIONS
            </span>
            <span class="date">{entry.date}</span>
            <span class="flag">{entry.flag}</span>
            {#if entry.payee}
                <span class="payee">"{entry.payee}"</span>
            {/if}
            <span class="narration">"{entry.narration}"</span>
            {#each entry.tags as tag}
                <span class="tag">#{tag}</span>
            {/each}
        </div>
        <div class="header-right">
             <button class="btn-icon delete-btn" on:click={() => dispatch('delete', entry)} title="Delete">
                ❌
            </button>
            <button class="btn-edit" on:click={() => dispatch('edit', entry)}>
                ✏️ Edit
            </button>
        </div>
    </div>

    <div class="card-body">
        {#each entry.postings as posting}
            <div class="posting-row">
                <div class="account">{posting.account}</div>
                <div class="amount" class:negative={posting.amount && posting.amount.startsWith('-')}>
                    {formatAmount(posting.amount, posting.currency)}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .card {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border-hover);
        border-radius: 6px;
        margin-bottom: var(--size-4-3);
        overflow: hidden;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--size-4-2) var(--size-4-3);
        background: var(--background-secondary-alt);
        border-bottom: 1px solid var(--background-modifier-border-hover);
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: var(--size-4-2);
        flex-wrap: wrap;
        font-family: var(--font-monospace);
        font-size: 0.85rem;
    }

    .header-right {
        display: flex;
        gap: 0.5rem;
        margin-left: auto;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        background: var(--background-modifier-form-field);
        color: var(--text-muted);
    }

    .date {
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.85rem;
    }

    .payee {
        font-style: italic;
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .narration {
        color: var(--text-normal);
        font-weight: 500;
        font-size: 0.85rem;
    }

    .tag {
        color: var(--text-accent);
        font-size: 0.8rem;
    }

    .btn-edit {
        padding: 3px 10px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        transition: all 0.2s;
        color: var(--text-normal);
    }

    .btn-edit:hover {
        background: var(--background-modifier-hover);
        color: var(--text-accent);
    }

    .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        font-size: 0.9rem;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .btn-icon:hover {
        opacity: 1;
        background: var(--background-modifier-hover);
        border-radius: 4px;
    }

    .delete-btn:hover {
        color: var(--text-error);
    }

    .card-body {
        padding: var(--size-4-1) 0;
    }

    .posting-row {
        display: flex;
        justify-content: space-between;
        padding: var(--size-4-2) var(--size-4-3);
        font-family: var(--font-monospace);
        font-size: 0.85rem;
        line-height: 1.2;
    }

    .posting-row:nth-child(even) {
        background-color: var(--background-primary-alt);
    }

    .account {
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .amount {
        font-weight: 600;
        color: var(--text-success); /* Default positive */
    }

    .amount.negative {
        color: var(--text-accent); /* Usually negative numbers are distinct */
        /* Or adhere to image: purple/blueish for amounts */
        color: var(--interactive-accent);
    }
</style>
