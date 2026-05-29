// src/lang/beancount-autocomplete.ts
// CodeMirror 6 account-name autocomplete for Beancount files.

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { parse as parseCsv } from 'csv-parse/sync';
import type BeancountPlugin from '../main';
import { getOpenAccounts } from '../utils/accounts';
import { runQuery } from '../utils/queryRunner';

const CACHE_TTL = 30_000; // 30 seconds

interface AccountCache {
    accounts: string[];
    timestamp: number;
}

// Per-plugin account cache keyed by plugin instance
const cacheMap = new WeakMap<BeancountPlugin, AccountCache>();

/**
 * Fetches open accounts sorted by usage frequency.
 * Falls back to alphabetical order if the frequency query fails.
 * Results are cached for CACHE_TTL milliseconds.
 */
async function fetchAccountsSorted(plugin: BeancountPlugin): Promise<string[]> {
    const cached = cacheMap.get(plugin);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.accounts;
    }

    let accounts: string[] = [];
    try {
        const open = await getOpenAccounts(plugin);
        const openSet = new Set(open);

        // Try to order by usage frequency from the postings table
        try {
            const csv = await runQuery(
                plugin,
                'SELECT account, COUNT(*) AS n FROM postings GROUP BY account ORDER BY COUNT(*) DESC'
            );
            const records = parseCsv(csv, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            }) as Array<{ account: string }>;

            const byFreq = records.map((r) => r.account).filter((a) => openSet.has(a));
            const seen = new Set(byFreq);
            const remaining = open.filter((a) => !seen.has(a)).sort();
            accounts = [...byFreq, ...remaining];
        } catch {
            accounts = open.slice().sort();
        }
    } catch {
        accounts = [];
    }

    cacheMap.set(plugin, { accounts, timestamp: Date.now() });
    return accounts;
}

/**
 * Invalidates the account cache for a given plugin instance.
 * Call this when the ledger file is saved or reloaded.
 */
export function invalidateAccountCache(plugin: BeancountPlugin): void {
    cacheMap.delete(plugin);
}

/**
 * CodeMirror CompletionSource for Beancount account names.
 * Triggers on account-like prefixes (Assets:, Liabilities:, etc.)
 * and does not fire inside comment lines or string literals.
 */
function accountCompletionSource(plugin: BeancountPlugin) {
    return async (context: CompletionContext): Promise<CompletionResult | null> => {
        const { state, pos } = context;
        const line = state.doc.lineAt(pos);
        const lineText = line.text;
        const lineUpToCursor = lineText.slice(0, pos - line.from);

        // Skip comment lines (Beancount uses ';' for comments)
        if (lineText.trimStart().startsWith(';')) return null;

        // Skip if the cursor is inside a string literal (heuristic: odd number of
        // unescaped double-quotes before the cursor on the same line)
        let inString = false;
        for (let i = 0; i < lineUpToCursor.length; i++) {
            if (lineUpToCursor[i] === '"' && (i === 0 || lineUpToCursor[i - 1] !== '\\')) {
                inString = !inString;
            }
        }
        if (inString) return null;

        // Match an account-style token ending at the cursor:
        // e.g. "Assets", "Assets:Bank", "Expenses:Food:Groceries"
        const match = lineUpToCursor.match(/([A-Z][A-Za-z0-9]*(?::[A-Za-z0-9]*)*)$/);
        if (!match) return null;

        const prefix = match[1];

        // Only activate for the five standard Beancount account root types
        if (!/^(?:Assets|Liabilities|Equity|Income|Expenses)/.test(prefix)) return null;

        const accounts = await fetchAccountsSorted(plugin);
        const options = accounts
            .filter((acc) => acc.startsWith(prefix))
            .map((account) => ({
                label: account,
                type: 'variable',
                detail: account.split(':')[0], // e.g. "Assets"
                boost: 0,                      // preserve frequency order from fetch
            }));

        if (options.length === 0) return null;

        return {
            from: pos - prefix.length,
            options,
            filter: false, // already filtered by prefix above
        };
    };
}

/**
 * Returns a CodeMirror extension that provides Beancount account-name autocomplete.
 * Should only be added when the plugin setting `accountAutocomplete` is enabled.
 */
export function beancountAutocomplete(plugin: BeancountPlugin): Extension {
    return autocompletion({
        override: [accountCompletionSource(plugin)],
        activateOnTyping: true,
    });
}
