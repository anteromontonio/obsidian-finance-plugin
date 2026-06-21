// src/settings.ts

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type BeancountPlugin from './main';
import ConnectionSettings from './ui/partials/settings/ConnectionSettings.svelte';
import { updateOperatingCurrency } from './utils/index';
import type { LintMode } from './lang/beancount-lint';

/**
 * Interface defining the plugin settings.


 */
export type FileOrganization = "yearly" | "monthly";
export type DashboardDefaultPeriod = "this-month" | "last-month" | "this-year" | "last-year";

export interface BeancountPluginSettings {
    /** Path to the main Beancount file. */
    beancountFilePath: string;
    /** Command to run Beancount/Python (e.g. "bean-query", "python3"). */
    beancountCommand: string;
    /** The primary currency for reporting and defaults. */
    operatingCurrency: string;
    /** Max transactions to fetch in the dashboard. */
    maxTransactionResults: number;
    /** Max entries to fetch in the journal. */
    maxJournalResults: number;
    /** Default period shown by dashboard period summaries. */
    dashboardDefaultPeriod: DashboardDefaultPeriod;
    // BQL Code Block Settings
    /** Whether to show tool buttons (copy, refresh) on query blocks. */
    bqlShowTools: boolean;
    /** Whether to show the query source code above results. */
    bqlShowQuery: boolean;
    /** Whether to enable debug logging. */
    debugMode: boolean;
    // Backup Settings
    /** Whether to create backup files when modifying the beancount file. */
    createBackups: boolean;
    /** Maximum number of backup files to keep (0 = unlimited). */
    maxBackupFiles: number;
    // Structured Layout Settings
    /** Name of the folder for structured layout (e.g., "Finances"). */
    structuredFolderName: string;
    /** Computed absolute path to the structured folder (set automatically). */
    structuredFolderPath: string;
    /** How to organize transaction files. */
    fileOrganization: FileOrganization;
    // Price Fetching Settings
    /** Whether to enable automatic price fetching on a schedule. */
    autoPriceFetch: boolean;
    /** Interval in hours for automatic price fetching. */
    priceFetchIntervalHours: number;
    /** Timestamp of last automatic price fetch. */
    lastAutoPriceFetch: number;
    /** Bean-price command path (detected automatically). */
    beanPriceCommand: string;
    /** Whether to enable account-name autocomplete in the Beancount editor. */
    accountAutocomplete: boolean;
    /** Whether to format the Beancount file on every save (Format on save). */
    formatOnSave: boolean;
    /** Lint mode for inline bean-check diagnostics: 'off' | 'on-save' | 'on-change'. */
    lintMode: LintMode;
}

/**
 * Default settings for the plugin.
 */
export const DEFAULT_SETTINGS: BeancountPluginSettings = {
    beancountFilePath: '',
    beancountCommand: '',
    operatingCurrency: 'USD',
    maxTransactionResults: 2000,
    maxJournalResults: 1000,
    dashboardDefaultPeriod: 'this-month',
    // BQL Code Block Settings
    bqlShowTools: true,
    bqlShowQuery: false,
    debugMode: false,
    // Backup Settings
    createBackups: true,
    maxBackupFiles: 10,
    // Structured Layout Settings
    structuredFolderName: 'Finances',
    structuredFolderPath: '',
    fileOrganization: 'yearly',
    // Price Fetching Settings
    autoPriceFetch: false,
    priceFetchIntervalHours: 24,
    lastAutoPriceFetch: 0,
    beanPriceCommand: '',
    // Editor Settings
    accountAutocomplete: true,
    formatOnSave: false,
    lintMode: 'on-save',
}

/**
 * BeancountSettingTab
 *
 * The settings tab for the plugin in Obsidian's settings modal.
 * Provides UI for configuring connection, currencies, limits, and templates.
 */
export class BeancountSettingTab extends PluginSettingTab {
    plugin: BeancountPlugin;
    private activeTab = 'general';

    constructor(app: App, plugin: BeancountPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.displayTab();
    }

    displayTab(): void {
        const { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl).setName('Beancount configuration').setHeading();

        // Create tab navigation
        const tabsContainer = containerEl.createDiv({ cls: 'beancount-settings-tabs' });
        const tabsNav = tabsContainer.createDiv({ cls: 'beancount-tabs-nav' });
        const tabsContent = tabsContainer.createDiv({ cls: 'beancount-tabs-content' });

        // Define tabs
        const tabs = [
            { id: 'general', label: '⚙️ General' },
            { id: 'connection', label: '🔌 Connection' },
            { id: 'files', label: '📁 File Organization' },
            { id: 'bql', label: '📊 BQL' },
            { id: 'performance', label: '⚡ Performance' },
            { id: 'backup', label: '💾 Backup' }
        ];

        // Create tab buttons
        tabs.forEach(tab => {
            const tabBtn = tabsNav.createDiv({ cls: 'beancount-tab-button' });
            tabBtn.textContent = tab.label;
            if (this.activeTab === tab.id) {
                tabBtn.addClass('active');
            }
            tabBtn.addEventListener('click', () => {
                this.activeTab = tab.id;
                this.displayTab();
            });
        });

        // Render active tab content
        switch (this.activeTab) {
            case 'general':
                this.renderGeneralTab(tabsContent);
                break;
            case 'connection':
                this.renderConnectionTab(tabsContent);
                break;
            case 'files':
                this.renderFilesTab(tabsContent);
                break;
            case 'bql':
                this.renderBQLTab(tabsContent);
                break;
            case 'performance':
                this.renderPerformanceTab(tabsContent);
                break;
            case 'backup':
                this.renderBackupTab(tabsContent);
                break;
        }


    }

    private renderGeneralTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Basic preferences').setHeading();

        new Setting(containerEl)
            .setName('Operating currency')
            .setDesc('The currency to use for transaction defaults and for consolidating totals (e.g., USD, INR).')
            .addText(text => {
                const validationEl = this.createValidationElement(containerEl);

                text
                    .setPlaceholder('USD')
                    .setValue(this.plugin.settings.operatingCurrency)
                    .onChange(async (value) => {
                        this.plugin.settings.operatingCurrency = value.toUpperCase();
                        await this.plugin.saveSettings();

                        if (value.trim()) {
                            const validation = this.validateCurrency(value);
                            this.updateValidationDisplay(validationEl, validation);
                        } else {
                            validationEl.textContent = '';
                        }

                        text.setValue(this.plugin.settings.operatingCurrency);
                    });

                if (this.plugin.settings.operatingCurrency) {
                    const validation = this.validateCurrency(this.plugin.settings.operatingCurrency);
                    this.updateValidationDisplay(validationEl, validation);
                }

                return text;
            })
            .addButton(button => button
                .setButtonText('Save to ledger')
                .setTooltip('Update the operating_currency option in your ledger.beancount file')
                .onClick(async () => {
                    const currency = this.plugin.settings.operatingCurrency;
                    if (!currency) {
                        new Notice('Operating currency is not set.');
                        return;
                    }
                    button.setButtonText('Saving…');
                    button.setDisabled(true);
                    const result = await updateOperatingCurrency(
                        this.plugin,
                        currency,
                        this.plugin.settings.createBackups
                    );
                    button.setDisabled(false);
                    button.setButtonText('Save to ledger');
                    if (result.success) {
                        new Notice(`Operating currency updated to ${currency} in ledger file.`);
                    } else {
                        new Notice(`Failed to update ledger: ${result.error}`);
                    }
                })
            );

        new Setting(containerEl)
            .setName('Default dashboard period')
            .setDesc('Choose the period shown by dashboard summaries when the dashboard first loads.')
            .addDropdown(dropdown => dropdown
                .addOption('this-month', 'This month')
                .addOption('last-month', 'Last month')
                .addOption('this-year', 'This year')
                .addOption('last-year', 'Last year')
                .setValue(this.plugin.settings.dashboardDefaultPeriod || 'this-month')
                .onChange(async (value) => {
                    this.plugin.settings.dashboardDefaultPeriod = value as DashboardDefaultPeriod;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable debug logging to the console.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        // Price Fetching Settings Section
        new Setting(containerEl).setName('Automatic price fetching').setHeading();

        new Setting(containerEl)
            .setName('Enable automatic price fetching')
            .setDesc('Automatically fetch commodity prices at scheduled intervals using bean-price.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoPriceFetch)
                .onChange(async (value) => {
                    this.plugin.settings.autoPriceFetch = value;
                    await this.plugin.saveSettings();
                    // If enabled at runtime, start the interval immediately — no restart needed
                    if (value) {
                        this.plugin.setupAutomaticPriceFetching();
                    }
                    // Trigger re-render to show/hide interval setting
                    this.displayTab();
                }));

        if (this.plugin.settings.autoPriceFetch) {
            new Setting(containerEl)
                .setName('Fetch interval (hours)')
                .setDesc('How often to automatically fetch prices for all commodities with configured price sources.')
                .addText(text => text
                    .setPlaceholder('24')
                    .setValue(String(this.plugin.settings.priceFetchIntervalHours))
                    .onChange(async (value) => {
                        const hours = parseInt(value);
                        if (!isNaN(hours) && hours > 0) {
                            this.plugin.settings.priceFetchIntervalHours = hours;
                            await this.plugin.saveSettings();
                        }
                    }));

            // Display last fetch time if available
            if (this.plugin.settings.lastAutoPriceFetch > 0) {
                const lastFetchDate = new Date(this.plugin.settings.lastAutoPriceFetch);
                const timeSince = this.formatTimeSince(lastFetchDate);

                const infoEl = containerEl.createDiv({ cls: 'setting-item-description' });
                infoEl.setCssStyles({
                    marginTop: '8px',
                    fontSize: '0.9em',
                    opacity: '0.7'
                });
                infoEl.textContent = `Last automatic fetch: ${timeSince} (${lastFetchDate.toLocaleString()})`;
            }
        }
    }

    /**
     * Formats a time duration as a human-readable string.
     */
    private formatTimeSince(date: Date): string {
        const now = new Date().getTime();
        const past = date.getTime();
        const diffMs = now - past;

        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    private renderConnectionTab(containerEl: HTMLElement): void {
        this.createConnectionSection(containerEl);
    }

    private renderBQLTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('BQL code blocks').setHeading();

        new Setting(containerEl)
            .setName('Show query tools')
            .setDesc('Display refresh, copy, and download buttons above BQL query results.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.bqlShowTools)
                .onChange(async (value) => {
                    this.plugin.settings.bqlShowTools = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show query text')
            .setDesc('Display the BQL query text above the results in a collapsible section.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.bqlShowQuery)
                .onChange(async (value) => {
                    this.plugin.settings.bqlShowQuery = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName('Editor configuration').setHeading();

        new Setting(containerEl)
            .setName('Editor autocomplete')
            .setDesc('Show context-aware completions in .beancount files: account names, payees, narrations, currencies/commodities, tags (#), and links (^). Reopen the file to apply changes.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.accountAutocomplete)
                .onChange(async (value) => {
                    this.plugin.settings.accountAutocomplete = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Format on save')
            .setDesc('Automatically format the Beancount file when saving: normalises indentation to 2 spaces, right-aligns amounts, and fixes @ price annotation spacing. Off by default.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.formatOnSave)
                .onChange(async (value) => {
                    this.plugin.settings.formatOnSave = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Inline lint mode')
            .setDesc('Show Beancount validation errors as inline squiggly underlines using the existing bean-query connection. Reopen the file to apply changes.')
            .addDropdown(drop => drop
                .addOption('off', 'Off')
                .addOption('on-save', 'On save (recommended)')
                .addOption('on-change', 'On change (2 s debounce)')
                .setValue(this.plugin.settings.lintMode)
                .onChange(async (value) => {
                    this.plugin.settings.lintMode = value as LintMode;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName('Named queries').setHeading();

        const queryInfoEl = containerEl.createDiv({ cls: 'setting-item-description' });
        queryInfoEl.setCssStyles({ marginBottom: '12px' });
        
        const p1 = queryInfoEl.createEl('p');
        p1.textContent = 'Define reusable BQL queries using the Beancount ';
        const codeQuery = p1.createEl('code');
        const queryText = 'query';
        codeQuery.textContent = queryText;
        p1.appendText(' directive stored in ');
        const codeQueries = p1.createEl('code');
        const queriesText = 'queries.beancount';
        codeQueries.textContent = queriesText;
        p1.appendText('.');

        const p2 = queryInfoEl.createEl('p');
        p2.textContent = 'Use the ';
        p2.createEl('strong', { text: 'Add' });
        p2.appendText(' ribbon button → ');
        p2.createEl('em', { text: '🔍 Query' });
        p2.appendText(' tab to create named queries.');

        const p3 = queryInfoEl.createEl('p');
        p3.textContent = 'In your notes, use ';
        const codeBqlq = p3.createEl('code');
        const bqlqText = 'bql-q:name';
        codeBqlq.textContent = bqlqText;
        p3.appendText(' to insert the query result inline.');
    }

    private renderPerformanceTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Performance').setHeading();

        new Setting(containerEl)
            .setName('Max transaction results')
            .setDesc('Maximum number of transactions to load at once (to prevent memory issues with large datasets).')
            .addText(text => text
                .setPlaceholder('2000')
                .setValue(this.plugin.settings.maxTransactionResults.toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= 10000) {
                        this.plugin.settings.maxTransactionResults = numValue;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Max journal results')
            .setDesc('Maximum number of journal entries to load at once.')
            .addText(text => text
                .setPlaceholder('1000')
                .setValue(this.plugin.settings.maxJournalResults.toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= 5000) {
                        this.plugin.settings.maxJournalResults = numValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }

    private renderBackupTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Backups').setHeading();

        new Setting(containerEl)
            .setName('Create backups')
            .setDesc('Create timestamped backup files before modifying your Beancount file. Highly recommended for data safety.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.createBackups)
                .onChange(async (value) => {
                    this.plugin.settings.createBackups = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max backup files')
            .setDesc('Maximum number of backup files to keep (oldest are deleted automatically). Set to 0 for unlimited backups.')
            .addText(text => text
                .setPlaceholder('10')
                .setValue(this.plugin.settings.maxBackupFiles.toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
                        this.plugin.settings.maxBackupFiles = numValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }

    private renderFilesTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('File organization').setHeading();

        containerEl.createEl('p', {
            text: 'Your finances are organized using a structured folder layout with separate files for accounts, transactions, prices, and more.',
            cls: 'setting-item-description'
        });

        // Folder name setting
        new Setting(containerEl)
            .setName('Folder name')
            .setDesc('Name of the folder containing your structured Beancount files.')
            .addText(text => text
                .setPlaceholder('Finances')
                .setValue(this.plugin.settings.structuredFolderName)
                .onChange(async (value) => {
                    this.plugin.settings.structuredFolderName = value || 'Finances';
                    await this.plugin.saveSettings();
                }));

        // File organization setting
        new Setting(containerEl)
            .setName('Transaction file organization')
            .setDesc('How transactions should be split into multiple files inside the transactions/ folder.')
            .addDropdown(dropdown => dropdown
                .addOption('yearly', 'Yearly (e.g. Transactions/2025.beancount)')
                .addOption('monthly', 'Monthly (e.g. Transactions/2025/2025-01.beancount)')
                .setValue(this.plugin.settings.fileOrganization)
                .onChange(async (value) => {
                    this.plugin.settings.fileOrganization = value as FileOrganization;
                    await this.plugin.saveSettings();
                }));

        // Display file structure info
        const infoDiv = containerEl.createDiv({ cls: 'structured-layout-info' });
        infoDiv.setCssStyles({
            padding: '10px',
            marginTop: '10px',
            backgroundColor: 'var(--background-secondary)',
            borderRadius: '5px'
        });

        infoDiv.createEl('strong', { text: 'Structured layout file organization:' });
        const fileList = infoDiv.createEl('ul');
        fileList.setCssStyles({
            marginTop: '8px',
            marginBottom: '0'
        });

        const files = [
            '📄 ledger.beancount - Main file with include statements',
            '📄 accounts.beancount - Account open/close directives',
            '📄 commodities.beancount - Commodity definitions',
            '📄 prices.beancount - Price directives',
            '📄 pads.beancount - Pad directives',
            '📄 balances.beancount - Balance assertions',
            '📄 notes.beancount - Note directives',
            '📄 events.beancount - Event directives',
            '📁 transactions/ - Folder with transaction files organized by year or month'
        ];

        files.forEach(file => {
            const li = fileList.createEl('li');
            li.setCssStyles({ marginBottom: '4px' });
            li.textContent = file;
        });

        // Show current path
        if (this.plugin.settings.beancountFilePath) {
            const pathDiv = containerEl.createDiv({ cls: 'current-path-display' });
            pathDiv.setCssStyles({
                marginTop: '15px',
                padding: '10px',
                backgroundColor: 'var(--background-modifier-border)',
                borderRadius: '5px'
            });

            pathDiv.createEl('div', {
                text: 'Main ledger file path:',
                cls: 'setting-item-name'
            });
            const descEl = pathDiv.createEl('div', {
                text: this.plugin.settings.beancountFilePath,
                cls: 'setting-item-description'
            });
            descEl.setCssStyles({ fontFamily: 'monospace' });
        }
    }

    private renderAdvancedTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Advanced').setHeading();

        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable detailed logging to the developer console for troubleshooting.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                    const { Logger } = await import('./utils/logger');
                    Logger.setDebugMode(value);
                }));
    }

    private validateCurrency(currency: string): { isValid: boolean; message: string } {
        if (!currency.trim()) {
            return { isValid: false, message: 'Currency is required' };
        }

        // Beancount currency: starts with an uppercase letter, followed by uppercase
        // letters, digits, or the symbols ' . _ - (e.g. USD, BTC, GOLD, INR, EUR)
        const currencyRegex = /^[A-Z][A-Z0-9'._-]*$/;
        if (!currencyRegex.test(currency.toUpperCase())) {
            return { isValid: false, message: 'Currency must start with a letter and contain only uppercase letters, digits, or \' . _ -' };
        }

        return { isValid: true, message: '✅ Valid currency code' };
    }

    private createValidationElement(container: HTMLElement): HTMLElement {
        const validationEl = container.createEl('div', {
            cls: 'beancount-validation-message'
        });
        return validationEl;
    }

    private updateValidationDisplay(element: HTMLElement, result: { isValid: boolean; message: string }) {
        element.textContent = result.message;
        element.classList.remove('beancount-validation-success', 'beancount-validation-error', 'beancount-validation-neutral');
        element.classList.add(result.isValid ? 'beancount-validation-success' : 'beancount-validation-error');
    }

    private createConnectionSection(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Connection configuration').setHeading();

        const desc = containerEl.createDiv({ cls: 'setting-item-description' });
        desc.setCssStyles({ marginBottom: '1em' });
        desc.textContent = 'Configure your Beancount file path and connection settings. The plugin will automatically detect your Python environment and test the connection.';

        const settingsContainer = containerEl.createDiv({ cls: 'beancount-connection-settings-container' });

        new ConnectionSettings({
            target: settingsContainer,
            props: {
                plugin: this.plugin,
                settings: this.plugin.settings,
                app: this.app
            }
        });
    }

    private setupFileAutocomplete(input: HTMLInputElement) {
        let suggestionContainer: HTMLElement | null = null;

        const showSuggestions = (files: string[]) => {
            this.hideSuggestions();

            if (files.length === 0) return;

            suggestionContainer = activeDocument.createElement('div');
            suggestionContainer.className = 'bql-file-suggestions';
            suggestionContainer.setCssStyles({
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                background: 'var(--background-primary)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-s)',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: '1000'
            });

            files.forEach((file, index) => {
                const item = activeDocument.createElement('div');
                item.className = 'bql-file-suggestion-item';
                item.textContent = file;
                item.setCssStyles({
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--background-modifier-border-hover)'
                });

                item.addEventListener('click', () => {
                    input.value = file;
                    input.dispatchEvent(new Event('input'));
                    this.hideSuggestions();
                });

                if (index === files.length - 1) {
                    item.setCssStyles({ borderBottom: 'none' });
                }

                suggestionContainer!.appendChild(item);
            });

            const parent = input.parentElement!;
            parent.setCssStyles({ position: 'relative' });
            parent.appendChild(suggestionContainer);
        };

        this.hideSuggestions = () => {
            if (suggestionContainer) {
                suggestionContainer.remove();
                suggestionContainer = null;
            }
        };

        input.addEventListener('input', () => {
            const value = input.value.toLowerCase();
            if (value.length < 1) {
                this.hideSuggestions();
                return;
            }

            const markdownFiles = this.app.vault.getMarkdownFiles()
                .map(file => file.path)
                .filter(path => path.toLowerCase().includes(value))
                .slice(0, 10);

            showSuggestions(markdownFiles);
        });

        activeDocument.addEventListener('click', (event) => {
            if (!input.contains(event.target as Node) && !suggestionContainer?.contains(event.target as Node)) {
                this.hideSuggestions();
            }
        });
    }

    private hideSuggestions: () => void = () => { };

    private showFileSuggestModal(input: HTMLInputElement) {
        const modal = activeDocument.createElement('div');
        modal.className = 'bql-file-modal';
        modal.setCssStyles({
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '9999'
        });

        const modalContent = modal.createEl('div', {
            cls: 'bql-file-modal-content'
        });
        modalContent.setCssStyles({
            background: 'var(--background-primary)',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80%',
            overflowY: 'auto',
            border: '1px solid var(--background-modifier-border)'
        });

        new Setting(modalContent).setName('Select template file').setHeading();

        const searchInput = modalContent.createEl('input', {
            type: 'text',
            placeholder: 'Search markdown files...'
        });
        searchInput.setCssStyles({
            width: '100%',
            padding: '8px',
            marginBottom: '16px',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            background: 'var(--background-secondary)',
            color: 'var(--text-normal)'
        });

        const fileList = modalContent.createEl('div', {
            cls: 'bql-file-list'
        });
        fileList.setCssStyles({
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px'
        });

        const updateFileList = (filter = '') => {
            fileList.empty();

            const markdownFiles = this.app.vault.getMarkdownFiles()
                .filter(file => filter === '' || file.path.toLowerCase().includes(filter.toLowerCase()))
                .slice(0, 50);

            if (markdownFiles.length === 0) {
                const noFiles = fileList.createEl('div', {
                    text: 'No Markdown files found',
                    cls: 'bql-no-files'
                });
                noFiles.setCssStyles({
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic'
                });
                return;
            }

            markdownFiles.forEach(file => {
                const item = fileList.createEl('div', {
                    text: file.path,
                    cls: 'bql-file-item'
                });
                item.setCssStyles({
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--background-modifier-border-hover)'
                });

                item.addEventListener('click', () => {
                    input.value = file.path;
                    input.dispatchEvent(new Event('input'));
                    modal.remove();
                });
            });
        };

        updateFileList();

        searchInput.addEventListener('input', () => {
            updateFileList(searchInput.value);
        });

        const buttonContainer = modalContent.createEl('div');
        buttonContainer.setCssStyles({
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '16px',
            gap: '8px'
        });

        const closeButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        closeButton.setCssStyles({
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            background: 'var(--interactive-normal)',
            color: 'var(--text-normal)',
            border: '1px solid var(--background-modifier-border)'
        });
        closeButton.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        activeDocument.body.appendChild(modal);
    }
}
