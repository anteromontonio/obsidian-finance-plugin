<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { JournalBalance } from '../../../../models/journal';

    export let entry: JournalBalance;

    const dispatch = createEventDispatcher();
</script>

<div class="card balance-card">
    <div class="card-header">
        <div class="header-left">
            <span class="badge badge-balance">
                <span class="icon">⚖️</span> BALANCE
            </span>
            <span class="date">{entry.date}</span>
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
        <div class="balance-row">
            <div class="account">{entry.account}</div>
            <div class="amount">
                {entry.amount} {entry.currency}
            </div>
        </div>
        {#if entry.diff_amount}
             <div class="balance-row diff">
                <div class="label">Difference:</div>
                <div class="amount error">
                    {entry.diff_amount} {entry.currency}
                </div>
            </div>
        {/if}
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
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: var(--size-4-2);
        font-family: var(--font-monospace);
        font-size: 0.85rem;
    }

    .header-right {
        display: flex;
        gap: 0.5rem;
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
        background: var(--color-purple);
        color: var(--text-on-accent);
    }

    .date {
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.85rem;
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
        padding: var(--size-4-2) var(--size-4-3);
        font-family: var(--font-monospace);
        font-size: 0.85rem;
        line-height: 1.2;
    }

    .balance-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .account {
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .amount {
        font-weight: 600;
        color: var(--text-normal);
        font-size: 0.9rem;
    }

    .diff {
        margin-top: var(--size-4-1);
        padding-top: var(--size-4-1);
        border-top: 1px dashed var(--background-modifier-border-hover);
    }

    .amount.error {
        color: var(--text-error);
    }
</style>
