// src/api.ts
//
// Public API surface exposed to other Obsidian plugins.
// Access via: (app.plugins.plugins['obsidian-finance-plugin'] as any).api
//
// Example usage from another plugin:
//
//   const financePlugin = (app.plugins.plugins as any)['obsidian-finance-plugin'];
//   if (financePlugin?.api) {
//     const csv = await financePlugin.api.runQuery('SELECT account, sum(position) GROUP BY account');
//   }

import type BeancountPlugin from './main';
import { runQuery, type BQLFormat } from './utils/queryRunner';

/**
 * The typed public API object exposed on the plugin instance.
 * Other plugins receive this via `(app.plugins.plugins['obsidian-finance-plugin'] as any).api`.
 */
export interface BeancountPluginApi {
    /**
     * Execute a Beancount Query Language (BQL) statement against the configured ledger.
     *
     * @param query    - A valid BQL query string (e.g. `"SELECT account, sum(position) GROUP BY account"`).
     * @param filepath - Optional absolute path to a `.beancount` file.
     *                   Defaults to the file configured in the plugin settings.
     * @param format   - Output format requested from `bean-query`.
     *                   `'csv'` (default) | `'text'` | `'beancount'`
     * @returns A promise that resolves to the raw query output as a string.
     *
     * @example
     * // Retrieve all open balances as CSV
     * const csv = await api.runQuery('SELECT account, sum(position) GROUP BY account');
     *
     * @example
     * // Query a specific ledger file in text format
     * const txt = await api.runQuery('SELECT date, narration', '/path/to/other.beancount', 'text');
     */
    runQuery(query: string, filepath?: string, format?: BQLFormat): Promise<string>;
}

/**
 * Builds the API object that is assigned to `BeancountPlugin.api`.
 * Called once during `onload()`.
 *
 * @internal
 */
export function createPluginApi(plugin: BeancountPlugin): BeancountPluginApi {
    return {
        runQuery(query: string, filepath?: string, format: BQLFormat = 'csv'): Promise<string> {
            return runQuery(plugin, query, filepath, format);
        },
    };
}
