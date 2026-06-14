// src/utils/structuredLayout.ts

import type BeancountPlugin from '../main';
import { Notice, TFile } from 'obsidian';
import { Logger } from './logger';
import { runQuery } from './index';
import * as path from 'path';

/**
 * File types in the structured layout.
 */
export type FileType = 'ledger' | 'accounts' | 'commodities' | 'prices' | 'pads' | 'balances' | 'notes' | 'events' | 'transactions' | 'queries';

/**
 * Operation types for routing to appropriate files.
 */
export type OperationType = 'transaction' | 'account' | 'commodity' | 'price' | 'pad' | 'balance' | 'note' | 'event' | 'query';

/**
 * Structured layout file definitions.
 */
export const STRUCTURED_FILES: Record<FileType, string> = {
    ledger: 'ledger.beancount',
    accounts: 'accounts.beancount',
    commodities: 'commodities.beancount',
    prices: 'prices.beancount',
    pads: 'pads.beancount',
    balances: 'balances.beancount',
    notes: 'notes.beancount',
    events: 'events.beancount',
    transactions: 'transactions', // This is a folder
    queries: 'queries.beancount'
};

/**
 * Create the structured folder layout with all required files.
 * Creates empty directive files - use migrateToStructuredLayout() to populate with data.
 * 
 * @param plugin - The Beancount plugin instance
 * @param folderName - Name of the folder to create (default: "Finances")
 * @returns The absolute path to the created folder
 */
export async function createStructuredFolder(
    plugin: BeancountPlugin,
    folderName = 'Finances'
): Promise<string> {
    try {
        const adapter = plugin.app.vault.adapter;
        // @ts-ignore
        const vaultRoot = adapter.getBasePath();
        const folderPath = path.join(vaultRoot, folderName);

        Logger.log('[structuredLayout] Creating structured folder:', folderPath);

        // Create main folder if it doesn't exist
        try {
            await plugin.app.vault.createFolder(folderName);
            Logger.log('[structuredLayout] Created main folder');
        } catch (e: unknown) {
            // Folder might already exist - only log if it's not that error
            if (!(e instanceof Error) || !e.message.includes('already exists')) {
                Logger.log('[structuredLayout] Folder creation error:', e);
            }
        }

        // Create transactions subfolder
        const transactionsFolderPath = path.join(folderName, 'transactions');
        try {
            await plugin.app.vault.createFolder(transactionsFolderPath);
            Logger.log('[structuredLayout] Created transactions folder');
        } catch (e: unknown) {
            // Folder might already exist - only log if it's not that error
            if (!(e instanceof Error) || !e.message.includes('already exists')) {
                Logger.log('[structuredLayout] Transactions folder creation error:', e);
            }
        }

        // Create initial year file (current year)
        const currentYear = new Date().getFullYear();
        await ensureTransactionFile(plugin, folderName);

        // Create individual files with empty content
        const files = getEmptyFileContents();

        for (const [fileType, fileName] of Object.entries(STRUCTURED_FILES)) {
            if (fileType === 'transactions') continue; // Skip, it's a folder
            if (fileType === 'ledger') continue; // Skip, handled separately with includes

            // Normalize path to use forward slashes for Obsidian vault API
            const filePath = path.join(folderName, fileName).replace(/\\/g, '/');
            const content = files[fileType as FileType] || '';

            try {
                const existing = plugin.app.vault.getAbstractFileByPath(filePath);
                if (!existing) {
                    await plugin.app.vault.create(filePath, content);
                    Logger.log(`[structuredLayout] Created ${filePath}`);
                } else {
                    Logger.log(`[structuredLayout] ${filePath} already exists, skipping`);
                }
            } catch (e: unknown) {
                // Only log as error if it's not "already exists"
                if (e instanceof Error && e.message.includes('already exists')) {
                    Logger.log(`[structuredLayout] ${filePath} already exists (caught in create), skipping`);
                } else {
                    Logger.error(`[structuredLayout] Failed to create ${filePath}:`, e);
                }
            }
        }

        // Generate and create/update ledger.beancount with include statements
        const includeStatements = generateIncludeStatements(folderName, [currentYear], plugin.settings.operatingCurrency || 'USD');
        // Normalize path to use forward slashes for Obsidian vault API
        const ledgerPath = path.join(folderName, STRUCTURED_FILES.ledger).replace(/\\/g, '/');

        try {
            const existing = plugin.app.vault.getAbstractFileByPath(ledgerPath);
            if (existing && existing instanceof TFile) {
                // File exists - update it
                await plugin.app.vault.modify(existing, includeStatements);
                Logger.log(`[structuredLayout] Updated ${ledgerPath} with includes`);
            } else if (!existing) {
                // Create new file
                await plugin.app.vault.create(ledgerPath, includeStatements);
                Logger.log(`[structuredLayout] Created ${ledgerPath} with includes`);
            }
        } catch (e: unknown) {
            // If file was just created by another process, try to read and update it
            if (e instanceof Error && e.message.includes('already exists')) {
                Logger.log(`[structuredLayout] ${ledgerPath} already exists, attempting to update...`);
                try {
                    // Wait a moment for the file to be available
                    await new Promise(resolve => window.setTimeout(resolve, 100));
                    // ledgerPath is already normalized, use as-is
                    const existing = plugin.app.vault.getAbstractFileByPath(ledgerPath);
                    if (existing && existing instanceof TFile) {
                        await plugin.app.vault.modify(existing, includeStatements);
                        Logger.log(`[structuredLayout] Updated ${ledgerPath} with includes after retry`);
                    }
                } catch (retryError) {
                    Logger.error(`[structuredLayout] Failed to update ledger file after retry:`, retryError);
                    throw retryError;
                }
            } else {
                Logger.error(`[structuredLayout] Failed to create/update ledger file:`, e);
                throw e;
            }
        }

        // Wait a moment for vault cache to index the new files
        await new Promise(resolve => window.setTimeout(resolve, 100));
        await updateLedgerIncludes(plugin, folderName);

        new Notice(`Structured layout created in ${folderName}/`);
        return folderPath;
    } catch (error: unknown) {
        Logger.error('[structuredLayout] Failed to create structured folder:', error);
        // Only show user-facing error if it's not just "already exists"
        if (!(error instanceof Error) || !error.message.includes('already exists')) {
            new Notice('Failed to create structured folder layout');
        }
        throw error;
    }
}

/**
 * Generate include statements for the main ledger file.
 * Order is critical: commodities → accounts → prices → pads → balances → notes → events → transactions
 * 
 * @param folderName - Name of the folder (for relative paths)
 * @param years - Array of years that have transaction files
 * @param operatingCurrency - The operating currency to embed in the ledger header (default: 'USD')
 * @returns The complete ledger.beancount content with includes
 */
export function generateIncludeStatements(folderName: string, years: number[], operatingCurrency = 'USD'): string {
    const header = `;; Main Ledger File
;; Auto-generated by Beancount for Obsidian
;; 
;; WARNING: Include statements are managed automatically.
;; Manual edits to include directives may be overwritten.

option "title" "Personal Finance"
option "operating_currency" "${operatingCurrency}"

`;

    const includes: string[] = [
        ';; Order matters: commodities must be defined before accounts',
        `include "commodities.beancount"`,
        '',
        ';; Chart of accounts',
        `include "accounts.beancount"`,
        '',
        ';; Price data',
        `include "prices.beancount"`,
        '',
        ';; Pads and balance assertions',
        `include "pads.beancount"`,
        `include "balances.beancount"`,
        '',
        ';; Named queries (beancount query directives)',
        `include "queries.beancount"`,
        '',
        ';; Notes and events',
        `include "notes.beancount"`,
        `include "events.beancount"`,
        '',
        ';; Transaction files by year (newest first)',
    ];

    // Add transaction files in descending order (newest first)
    // NOTE: This might generate initially yearly paths even if monthly is selected,
    // but updateTransactionIncludes will fix this right away based on actual files.
    const sortedYears = [...years].sort((a, b) => b - a);
    for (const year of sortedYears) {
        includes.push(`include "transactions/${year}.beancount"`);
    }

    return header + includes.join('\n') + '\n';
}

/**
 * Ensure a year file exists in the transactions folder.
 * Creates the file if it doesn't exist and updates the main ledger's includes.
 * 
 * @param plugin - The Beancount plugin instance
 * @param folderName - Name of the structured folder
 * @param year - The year to ensure exists
 */
export async function ensureTransactionFile(
    plugin: BeancountPlugin,
    folderName: string,
    date?: string
): Promise<void> {
    const now = date ? new Date(date) : new Date();
    const year = now.getFullYear();
    let filePath: string;
    let fileContent: string;
    let title: string;

    if (plugin.settings.fileOrganization === 'monthly') {
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const yearFolder = path.join(folderName, 'transactions', `${year}`).replace(/\\/g, '/');

        // Ensure year folder exists
        if (!plugin.app.vault.getAbstractFileByPath(yearFolder)) {
            try {
                await plugin.app.vault.createFolder(yearFolder);
            } catch (e: unknown) {
                if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
            }
        }

        filePath = path.join(yearFolder, `${year}-${month}.beancount`).replace(/\\/g, '/');
        title = `${year}-${month}`;
        fileContent = `;; Transactions for ${year}-${month}\n;; Auto-generated by Beancount for Obsidian\n\n`;
    } else {
        filePath = path.join(folderName, 'transactions', `${year}.beancount`).replace(/\\/g, '/');
        title = `${year}`;
        fileContent = `;; Transactions for ${year}\n;; Auto-generated by Beancount for Obsidian\n\n`;
    }

    const existing = plugin.app.vault.getAbstractFileByPath(filePath);

    if (!existing) {
        try {
            await plugin.app.vault.create(filePath, fileContent);
            Logger.log(`[structuredLayout] Created transaction file: ${filePath}`);

            // Wait a moment for vault cache to update
            await new Promise(resolve => window.setTimeout(resolve, 100));

            // Update ledger.beancount to include this file
            await updateLedgerIncludes(plugin, folderName, year); // Keep year for compatibility, but we rely on file scan

            new Notice(`Created ${title} transaction file and updated ledger includes`);
        } catch (e: unknown) {
            // If file already exists, just log it - don't throw
            if (e instanceof Error && e.message.includes('already exists')) {
                Logger.log(`[structuredLayout] Transaction file ${filePath} already exists, skipping`);
            } else {
                Logger.error(`[structuredLayout] Failed to create transaction file ${filePath}:`, e);
                throw e;
            }
        }
    } else {
        Logger.log(`[structuredLayout] Transaction file ${filePath} already exists`);
    }
}

/**
 * Update only the transaction include statements in the ledger file, preserving other content.
 * 
 * @param plugin - The Beancount plugin instance
 * @param folderName - Name of the structured folder
 * @param years - Array of years that have transaction files
 */
async function updateTransactionIncludes(
    plugin: BeancountPlugin,
    folderName: string,
    years: number[]
): Promise<void> {
    // Normalize path to use forward slashes for Obsidian vault API
    const ledgerPath = path.join(folderName, STRUCTURED_FILES.ledger).replace(/\\/g, '/');
    Logger.log(`[updateTransactionIncludes] Looking for ledger at: ${ledgerPath}`);

    const ledgerFile = plugin.app.vault.getAbstractFileByPath(ledgerPath);

    if (!ledgerFile || !(ledgerFile instanceof TFile)) {
        Logger.error(`[updateTransactionIncludes] Ledger file not found at ${ledgerPath}`);
        new Notice(`Error: Could not find ledger file at ${ledgerPath}`);
        return;
    }

    Logger.log(`[updateTransactionIncludes] Found ledger file, reading content...`);

    // Read current ledger content
    const currentContent = await plugin.app.vault.read(ledgerFile);

    // Find the transaction includes section
    const transactionMarker = ';; Transaction files by year';
    const markerIndex = currentContent.indexOf(transactionMarker);

    if (markerIndex === -1) {
        // If marker not found, this might be a custom ledger file
        // Don't modify it automatically
        Logger.warn(`[updateTransactionIncludes] Transaction marker not found in ledger. File might be customized. Skipping automatic update.`);
        new Notice('Warning: ledger.beancount appears to be customized. Please manually add transaction includes.');
        return;
    }

    // Split content at the marker
    const beforeMarker = currentContent.substring(0, markerIndex);

    // We need to fetch all transaction files to generate includes properly, as years array might be insufficient for monthly.
    // So instead of just years, let's scan the transactions folder for ALL .beancount files to be safe, and include them sorted.
    const transactionsFolderPath = path.join(folderName, 'transactions').replace(/\\/g, '/');
    const files = plugin.app.vault.getFiles().filter(f =>
        f.path.startsWith(transactionsFolderPath) && f.extension === 'beancount'
    );

    // Sort files descending by path name so newer ones are first
    files.sort((a, b) => b.path.localeCompare(a.path));

    // Generate new transaction includes
    const transactionIncludes = [
        transactionMarker + ' (newest first)',
        ...files.map(file => {
            // we need the relative path inside the folderName
            // file.path is like "Finances/transactions/2025/2025-01.beancount"
            // we want `include "transactions/2025/2025-01.beancount"`
            const relativeToFolder = file.path.substring(folderName.length + 1); // remove "Finances/"
            return `include "${relativeToFolder}"`;
        })
    ].join('\n') + '\n';

    // Find where the next section starts (or end of file)
    // Look for the next ";;" comment or end of file
    const afterMarkerContent = currentContent.substring(markerIndex);
    const lines = afterMarkerContent.split('\n');
    let endOfTransactionSection = 1; // Start after the marker line

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Stop when we hit a non-include line that's not empty or a comment continuation
        if (line && !line.startsWith('include "transactions/') && !line.startsWith(';;')) {
            endOfTransactionSection = i;
            break;
        }
        if (i === lines.length - 1) {
            endOfTransactionSection = i + 1;
        }
    }

    const afterIncludes = lines.slice(endOfTransactionSection).join('\n');

    // Reconstruct the file
    const newContent = beforeMarker + transactionIncludes + afterIncludes;

    // Write back
    await plugin.app.vault.modify(ledgerFile, newContent);
    Logger.log(`[updateTransactionIncludes] Updated transaction includes: ${files.map(f => f.name).join(', ')}`);
}

/**
 * Update the main ledger file's include statements based on existing year files.
 * 
 * @param plugin - The Beancount plugin instance
 * @param folderName - Name of the structured folder
 * @param additionalYear - Optional year to include even if not found in scan (for newly created files)
 */
async function updateLedgerIncludes(
    plugin: BeancountPlugin,
    folderName: string,
    additionalYear?: number
): Promise<void> {
    try {
        Logger.log(`[updateLedgerIncludes] Starting update for folder: ${folderName}, additionalYear: ${additionalYear}`);

        // Scan transactions folder for year files
        // Normalize path to use forward slashes for Obsidian vault API
        const transactionsFolderPath = path.join(folderName, 'transactions').replace(/\\/g, '/');
        const files = plugin.app.vault.getFiles().filter(f =>
            f.path.startsWith(transactionsFolderPath) && f.extension === 'beancount'
        );

        Logger.log(`[updateLedgerIncludes] Found ${files.length} year files in ${transactionsFolderPath}`);

        // Use the smarter update function that preserves other content
        // updateTransactionIncludes now scans the directory itself, so we don't need to pass years array.
        await updateTransactionIncludes(plugin, folderName, []);

        Logger.log(`[updateLedgerIncludes] Successfully updated ledger includes`);
        new Notice(`Updated ledger.beancount with transaction file(s)`);
    } catch (e) {
        Logger.error('[updateLedgerIncludes] Failed to update ledger includes:', e);
        new Notice(`Error updating ledger includes: ${e.message}`);
    }
}

/**
 * Get the target file path for a given operation type.
 * 
 * @param plugin - The Beancount plugin instance
 * @param operationType - The type of operation being performed
 * @param date - Optional date for transaction routing (to determine year)
 * @returns The absolute path to the target file
 */
export function getTargetFile(
    plugin: BeancountPlugin,
    operationType: OperationType,
    date?: string
): string {
    const folderName = plugin.settings.structuredFolderName || 'Finances';
    // @ts-ignore
    const vaultRoot = plugin.app.vault.adapter.getBasePath();

    let relativePath: string;

    switch (operationType) {
        case 'transaction':
            if (date) {
                const year = new Date(date).getFullYear();
                if (plugin.settings.fileOrganization === 'monthly') {
                    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
                    relativePath = path.join(folderName, 'transactions', `${year}`, `${year}-${month}.beancount`);
                } else {
                    relativePath = path.join(folderName, 'transactions', `${year}.beancount`);
                }
            } else {
                // Default to current year/month
                const now = new Date();
                const currentYear = now.getFullYear();
                if (plugin.settings.fileOrganization === 'monthly') {
                    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
                    relativePath = path.join(folderName, 'transactions', `${currentYear}`, `${currentYear}-${currentMonth}.beancount`);
                } else {
                    relativePath = path.join(folderName, 'transactions', `${currentYear}.beancount`);
                }
            }
            break;
        case 'account':
            relativePath = path.join(folderName, STRUCTURED_FILES.accounts);
            break;
        case 'commodity':
            relativePath = path.join(folderName, STRUCTURED_FILES.commodities);
            break;
        case 'price':
            relativePath = path.join(folderName, STRUCTURED_FILES.prices);
            break;
        case 'pad':
            relativePath = path.join(folderName, STRUCTURED_FILES.pads);
            break;
        case 'balance':
            relativePath = path.join(folderName, STRUCTURED_FILES.balances);
            break;
        case 'note':
            relativePath = path.join(folderName, STRUCTURED_FILES.notes);
            break;
        case 'event':
            relativePath = path.join(folderName, STRUCTURED_FILES.events);
            break;
        case 'query':
            relativePath = path.join(folderName, STRUCTURED_FILES.queries);
            break;
        default:
            // Fallback to ledger file
            relativePath = path.join(folderName, STRUCTURED_FILES.ledger);
    }

    return path.join(vaultRoot, relativePath);
}

/**
 * Get the path to the main ledger file (entry point for BQL queries).
 * 
 * @param plugin - The Beancount plugin instance
 * @returns The absolute path to ledger.beancount
 */
export function getMainLedgerPath(plugin: BeancountPlugin): string {
    const folderName = plugin.settings.structuredFolderName || 'Finances';
    // @ts-ignore
    const vaultRoot = plugin.app.vault.adapter.getBasePath();
    return path.join(vaultRoot, folderName, STRUCTURED_FILES.ledger);
}

/**
 * Get empty file contents for initial setup.
 */
function getEmptyFileContents(): Record<FileType, string> {
    return {
        ledger: '', // Will be generated with includes
        accounts: `;; Chart of Accounts
;; Define your account structure here

`,
        commodities: `;; Commodity Definitions
;; Define commodities (currencies, stocks, etc.) here

`,
        prices: `;; Price Data
;; Historical price information

`,
        pads: `;; Pad Directives
;; Automatic balance padding entries

`,
        balances: `;; Balance Assertions
;; Balance verification statements

`,
        notes: `;; Notes
;; Account and transaction notes

`,
        events: `;; Events
;; Financial events and milestones

`,
        transactions: '', // Folder, not a file
        queries: `;; Named Queries
;; Define reusable BQL queries using the beancount query directive
;; Format: YYYY-MM-DD query "name" "SELECT ..."
;; Usage in notes: \`bql-q:name\` for inline results

`
    };
}

/**
 * Migration: Convert existing single-file ledger to structured layout.
 * Uses BQL PRINT statements to extract directives by type.
 * 
 * @param plugin - The Beancount plugin instance
 * @param targetFolderName - Name of folder to create for structured layout
 * @returns Promise with success status
 */
export async function migrateToStructuredLayout(
    plugin: BeancountPlugin,
    targetFolderName = 'Finances'
): Promise<{ success: boolean; error?: string }> {
    try {
        Logger.log('[Migration] Starting migration to structured layout');

        // Validate that we have a source file
        const sourceFile = plugin.settings.beancountFilePath;
        if (!sourceFile) {
            return { success: false, error: 'No source Beancount file configured' };
        }

        Logger.log(`[Migration] Source file: ${sourceFile}`);

        // Step 0: Check if target folder already exists
        const existingFolder = plugin.app.vault.getAbstractFileByPath(targetFolderName);
        if (existingFolder) {
            return {
                success: false,
                error: `Folder "${targetFolderName}" already exists. Please delete it manually or choose a different folder name.`
            };
        }

        // Step 1: Create just the folder structure (not the files - migration will create them with content)
        Logger.log(`[Migration] Creating folder structure: ${targetFolderName}`);
        try {
            await plugin.app.vault.createFolder(targetFolderName);
        } catch (e: unknown) {
            if (!(e instanceof Error) || !e.message.includes('already exists')) {
                throw e;
            }
        }

        const transactionsFolderPath = path.join(targetFolderName, 'transactions');
        try {
            await plugin.app.vault.createFolder(transactionsFolderPath);
        } catch (e: unknown) {
            if (!(e instanceof Error) || !e.message.includes('already exists')) {
                throw e;
            }
        }

        // Step 2: Extract all unique years from transactions
        Logger.log('[Migration] Extracting transaction years...');
        const years = await extractTransactionYears(plugin, sourceFile);
        Logger.log(`[Migration] Found years: ${years.join(', ')}`);

        // Step 3: Migrate each directive type
        const migrations = [
            { type: 'commodity', file: STRUCTURED_FILES.commodities, query: "PRINT FROM type='commodity'" },
            { type: 'open/close', file: STRUCTURED_FILES.accounts, query: "PRINT FROM type='open' OR type='close'" },
            { type: 'price', file: STRUCTURED_FILES.prices, query: "PRINT FROM type='price'" },
            { type: 'pad', file: STRUCTURED_FILES.pads, query: "PRINT FROM type='pad'" },
            { type: 'balance', file: STRUCTURED_FILES.balances, query: "PRINT FROM type='balance'" },
            { type: 'note', file: STRUCTURED_FILES.notes, query: "PRINT FROM type='note'" },
            { type: 'event', file: STRUCTURED_FILES.events, query: "PRINT FROM type='event'" },
            { type: 'query', file: STRUCTURED_FILES.queries, query: "PRINT FROM type='query'" }
        ];

        // Migrate non-transaction directives
        for (const migration of migrations) {
            Logger.log(`[Migration] Migrating ${migration.type}...`);
            try {
                const content = await runQuery(plugin, migration.query, sourceFile);
                // Normalize path to use forward slashes for Obsidian vault API
                const filePath = path.join(targetFolderName, migration.file).replace(/\\/g, '/');

                if (content && content.trim()) {
                    await writeToFile(plugin, filePath, content);
                    Logger.log(`[Migration] ✓ Migrated ${migration.type} to ${migration.file}`);
                } else {
                    // Create empty file so includes don't break
                    await writeToFile(plugin, filePath, '');
                    Logger.log(`[Migration] - No ${migration.type} directives found, created empty file`);
                }
            } catch (error) {
                Logger.log(`[Migration] ! Failed to migrate ${migration.type}: ${error}`);
                // Always create the file even on failure — ledger.beancount includes it,
                // so a missing file causes a Beancount "File glob does not match" error.
                try {
                    const filePath = path.join(targetFolderName, migration.file).replace(/\\/g, '/');
                    await writeToFile(plugin, filePath, '');
                    Logger.log(`[Migration] - Created empty fallback file for ${migration.file}`);
                } catch (fallbackError) {
                    Logger.error(`[Migration] ! Failed to create fallback file for ${migration.file}:`, fallbackError);
                }
            }
        }

        // Step 4: Migrate transactions by fetching all at once and partitioning by configured period
        Logger.log('[Migration] Migrating transactions by period...');
        try {
            const allTransactionsQuery = "PRINT FROM type='transaction'";
            const allTransactionsContent = await runQuery(plugin, allTransactionsQuery, sourceFile, 'text');
            const fileOrganization = plugin.settings.fileOrganization || 'yearly';
            const transactionsByPeriod = allTransactionsContent && allTransactionsContent.trim()
                ? splitTransactionsByPeriod(allTransactionsContent, fileOrganization)
                : {};

            // Determine what periods to iterate over. If there are no transactions, we should at least create current period.
            const periods = Object.keys(transactionsByPeriod);
            if (periods.length === 0) {
                const now = new Date();
                const currentPeriod = fileOrganization === 'monthly' ? `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}` : `${now.getFullYear()}`;
                periods.push(currentPeriod);
            }

            for (const period of periods) {
                try {
                    const content = transactionsByPeriod[period] || '';

                    let periodFilePath: string;
                    if (fileOrganization === 'monthly') {
                        const [year] = period.split('-');
                        const yearFolder = path.join(targetFolderName, 'transactions', year).replace(/\\/g, '/');
                        if (!plugin.app.vault.getAbstractFileByPath(yearFolder)) {
                            try {
                                await plugin.app.vault.createFolder(yearFolder);
                            } catch (e: unknown) {
                                if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
                            }
                        }
                        periodFilePath = path.join(yearFolder, `${period}.beancount`).replace(/\\/g, '/');
                    } else {
                        periodFilePath = path.join(targetFolderName, 'transactions', `${period}.beancount`).replace(/\\/g, '/');
                    }

                    if (content && content.trim()) {
                        await writeToFile(plugin, periodFilePath, content);
                        Logger.log(`[Migration] ✓ Migrated ${period} transactions to ${periodFilePath}`);
                    } else {
                        // Create empty file so includes don't break
                        await writeToFile(plugin, periodFilePath, '');
                        Logger.log(`[Migration] - No transactions found for ${period}, created empty file`);
                    }
                } catch (error) {
                    Logger.error(`[Migration] ! Failed to write ${period} transactions:`, error);
                    // Continue with other periods
                }
            }
        } catch (error) {
            Logger.error(`[Migration] ! Failed to fetch transactions:`, error);
            // If fetching all fails, we can't migrate any transactions easily, but we'll try to continue
        }

        // Step 5: Update main ledger with includes
        Logger.log('[Migration] Generating main ledger with includes...');
        const includeStatements = generateIncludeStatements(targetFolderName, years, plugin.settings.operatingCurrency || 'USD');
        // Normalize path to use forward slashes for Obsidian vault API
        const ledgerPath = path.join(targetFolderName, STRUCTURED_FILES.ledger).replace(/\\/g, '/');
        await writeToFile(plugin, ledgerPath, includeStatements);

        // Wait a moment for vault cache to index the new files
        await new Promise(resolve => window.setTimeout(resolve, 100));
        await updateLedgerIncludes(plugin, targetFolderName);

        // Step 6: Update plugin settings
        plugin.settings.structuredFolderName = targetFolderName;
        const mainLedgerPath = getMainLedgerPath(plugin);
        plugin.settings.structuredFolderPath = mainLedgerPath;
        plugin.settings.beancountFilePath = mainLedgerPath;
        await plugin.saveSettings();

        Logger.log('[Migration] ✓ Migration completed successfully!');
        new Notice(`Migration complete! Files created in ${targetFolderName}/`);

        return { success: true };
    } catch (error) {
        Logger.error('[Migration] Migration failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Splits a bulk transaction string (e.g. from `PRINT FROM type='transaction'`) into a map of year -> transactions string.
 * This is used to avoid making N+1 queries to the Beancount file when migrating transactions by year.
 *
 * @param content - The bulk string containing transactions.
 * @param years - The list of valid years.
 * @returns Record of years mapping to transaction strings.
 */
export function splitTransactionsByPeriod(content: string, fileOrganization: 'yearly' | 'monthly'): Record<string, string> {
    const transactionsByPeriod: Record<string, string[]> = {};

    const lines = content.split('\n');
    let currentPeriod: string | null = null;
    let currentBlock: string[] = [];

    // Match a transaction date line: YYYY-MM-DD
    const dateRegex = /^(\d{4})-(\d{2})-\d{2}\s+/;

    for (const line of lines) {
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
            // End of previous block
            if (currentPeriod && currentBlock.length > 0) {
                if (!transactionsByPeriod[currentPeriod]) {
                    transactionsByPeriod[currentPeriod] = [];
                }
                transactionsByPeriod[currentPeriod].push(currentBlock.join('\n'));
            }

            // Start of new block
            const year = dateMatch[1];
            const month = dateMatch[2];
            currentPeriod = fileOrganization === 'monthly' ? `${year}-${month}` : `${year}`;
            currentBlock = [line];
        } else if (currentBlock.length > 0) {
            // Continuation of current block
            currentBlock.push(line);
        }
    }

    // Flush last block
    if (currentPeriod && currentBlock.length > 0) {
        if (!transactionsByPeriod[currentPeriod]) {
            transactionsByPeriod[currentPeriod] = [];
        }
        transactionsByPeriod[currentPeriod].push(currentBlock.join('\n'));
    }

    const result: Record<string, string> = {};
    for (const period of Object.keys(transactionsByPeriod)) {
        result[period] = transactionsByPeriod[period].join('\n\n').trim();
    }
    return result;
}

/**
 * Extract all unique years from transactions in the current ledger.
 * 
 * @param plugin - The Beancount plugin instance
 * @param sourceFile - Path to the source Beancount file to query
 * @returns Array of years as numbers
 */
async function extractTransactionYears(plugin: BeancountPlugin, sourceFile: string): Promise<number[]> {
    try {
        // Query to get all transaction years
        const query = "SELECT DISTINCT year FROM type='transaction' ORDER BY year";
        const csvOutput = await runQuery(plugin, query, sourceFile);

        if (!csvOutput || !csvOutput.trim()) {
            Logger.log('[Migration] No transactions found');
            return [];
        }

        // Parse CSV output (skip header, extract year column)
        const lines = csvOutput.trim().split('\n');
        const years: number[] = [];

        for (let i = 1; i < lines.length; i++) { // Skip header row
            const line = lines[i].trim();
            if (line) {
                const year = parseInt(line, 10);
                if (!isNaN(year) && year > 1900 && year < 2100) {
                    years.push(year);
                }
            }
        }

        return years.sort((a, b) => a - b); // Sort ascending
    } catch (error) {
        Logger.error('[Migration] Failed to extract transaction years:', error);
        // Fallback: return current year
        return [new Date().getFullYear()];
    }
}

/**
 * Write content to a file in the vault, handling both new and existing files.
 * 
 * @param plugin - The Beancount plugin instance
 * @param relativePath - Relative path from vault root
 * @param content - Content to write
 */
async function writeToFile(
    plugin: BeancountPlugin,
    relativePath: string,
    content: string
): Promise<void> {
    try {
        // Normalize path to use forward slashes for Obsidian vault API (safety measure)
        const normalizedPath = relativePath.replace(/\\/g, '/');

        const existing = plugin.app.vault.getAbstractFileByPath(normalizedPath);

        if (existing && existing instanceof TFile) {
            // File exists - replace content (migration always does fresh write)
            await plugin.app.vault.modify(existing, content);
        } else {
            // Create new file, with fallback to modify if it was just created
            try {
                await plugin.app.vault.create(normalizedPath, content);
            } catch (createError: unknown) {
                // If file was just created by another process, try to modify it
                if (createError instanceof Error && createError.message.includes('already exists')) {
                    const file = plugin.app.vault.getAbstractFileByPath(normalizedPath);
                    if (file && file instanceof TFile) {
                        await plugin.app.vault.modify(file, content);
                    } else {
                        throw createError;
                    }
                } else {
                    throw createError;
                }
            }
        }
    } catch (error) {
        Logger.error(`[Migration] Failed to write to ${relativePath}:`, error);
        throw error;
    }
}

