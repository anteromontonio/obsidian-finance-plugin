<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { JournalNote } from '../../../../models/journal';

    export let entry: JournalNote;

    const dispatch = createEventDispatcher();
</script>

<div class="card note-card">
    <div class="card-header">
        <div class="header-left">
            <span class="badge badge-note">
                <span class="icon">📝</span> NOTE
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
        <div class="note-account">{entry.account}</div>
        <div class="note-content">
            {entry.comment}
        </div>
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
        background: var(--background-modifier-form-field);
        color: var(--text-muted);
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
    }

    .note-account {
        font-family: var(--font-monospace);
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-bottom: var(--size-4-1);
    }

    .note-content {
        white-space: pre-wrap;
        color: var(--text-normal);
        font-size: 0.9rem;
        line-height: 1.35;
    }
</style>
