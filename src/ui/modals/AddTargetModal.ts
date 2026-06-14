// src/ui/modals/AddTargetModal.ts

import { App, Modal, Notice } from 'obsidian';
import type BeancountPlugin from '../../main';
import AddTargetModalComponent from './AddTargetModal.svelte';
import { getOpenAccounts, runQuery, createIndicatorDirective, updateIndicatorDirective } from '../../utils';
import { getAllCurrenciesQuery } from '../../queries';
import { parse as parseCsv } from 'csv-parse/sync';
import { Logger } from '../../utils/logger';

export class AddTargetModal extends Modal {
    plugin: BeancountPlugin;
    private component: any;
    private editingIndicator?: any;
    private onSuccess?: () => void;

    constructor(app: App, plugin: BeancountPlugin, editingIndicator?: any, onSuccess?: () => void) {
        super(app);
        this.plugin = plugin;
        this.editingIndicator = editingIndicator;
        this.onSuccess = onSuccess;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.modalEl.setCssStyles({ maxWidth: '560px', width: '90vw' });
        this.setTitle(this.editingIndicator ? 'Edit Target' : 'Add Target');

        const operatingCurrency = this.plugin.settings.operatingCurrency || 'USD';
        // Fetch accounts and currencies from the ledger, fall back silently on error
        let accounts: string[] = [];
        let currencies: string[] = [operatingCurrency];
        try {
            const [accs, csvResult] = await Promise.all([
                getOpenAccounts(this.plugin),
                runQuery(this.plugin, getAllCurrenciesQuery()).catch(() => ''),
            ]);
            accounts = accs;
            if (csvResult) {
                const rows = parseCsv(csvResult, { columns: true, skip_empty_lines: true, trim: true }) as any[];
                const fetched = rows.map((r: any) => r['currency_']).filter(Boolean) as string[];
                if (fetched.length > 0) currencies = fetched;
            }
            // Always include the operating currency
            if (!currencies.includes(operatingCurrency)) currencies.unshift(operatingCurrency);
        } catch (err) {
            Logger.log('[AddTargetModal] Could not prefetch accounts/currencies:', err);
        }

        this.component = new (AddTargetModalComponent as any)({
            target: contentEl,
            props: {
                accounts,
                currencies,
                defaultCurrency: operatingCurrency,
                editingIndicator: this.editingIndicator,
            },
        });

        this.component.$on('save', async (e: any) => {
            const { name, accountQuery, cycle, target, currency, isRollover, startDate, tag, tagMode } = e.detail;
            Logger.log('[AddTargetModal] save event', e.detail);

            try {
                let result;
                if (this.editingIndicator) {
                    result = await updateIndicatorDirective(this.plugin, this.editingIndicator.filename, this.editingIndicator.lineno, {
                        type: 'Target',
                        name,
                        accountQuery,
                        cycle,
                        target,
                        currency,
                        isRollover,
                        startDate,
                        tag,
                        tagMode,
                    });
                } else {
                    result = await createIndicatorDirective(this.plugin, {
                        type: 'Target',
                        name,
                        accountQuery,
                        cycle,
                        target,
                        currency,
                        isRollover,
                        startDate,
                        tag,
                        tagMode,
                    });
                }

                if (result.success) {
                    new Notice(this.editingIndicator ? `Target "${name}" updated successfully` : `Target "${name}" created successfully`);
                    this.close();
                    if (this.onSuccess) this.onSuccess();
                } else {
                    new Notice(`Failed to save target: ${result.error || 'Unknown error'}`);
                }
            } catch (error) {
                Logger.error('[AddTargetModal] Error saving target:', error);
                new Notice(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        this.component.$on('cancel', () => this.close());
    }

    onClose() {
        if (this.component) {
            this.component.$destroy();
            this.component = null;
        }
    }
}
