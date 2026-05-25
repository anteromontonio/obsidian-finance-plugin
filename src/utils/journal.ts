// src/utils/journal.ts
// BQL-backed journal entry fetchers: balance assertions and notes.

import { parse as parseCsv } from 'csv-parse/sync';
import type BeancountPlugin from '../main';
import { runQuery } from './queryRunner';
import { Logger } from './logger';

// --- BALANCE ENTRIES ---

/**
 * Fetches balance entries from Beancount using BQL.
 */
export async function getBalanceEntries(
    plugin: BeancountPlugin,
    filters: any = {},
    page: number = 1,
    pageSize: number = 200
): Promise<any> {
    try {
        Logger.log('[getBalanceEntries] Fetching with filters:', filters);

        const whereConditions: string[] = [];
        if (filters.startDate) whereConditions.push(`date >= ${filters.startDate}`);
        if (filters.endDate) whereConditions.push(`date <= ${filters.endDate}`);
        if (filters.account) whereConditions.push(`account ~ "${filters.account}"`);

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const query = `SELECT date, account, amount, tolerance, discrepancy FROM #balances ${whereClause} ORDER BY date DESC, account`;

        Logger.log('[getBalanceEntries] Running BQL query:', query);
        const csv = await runQuery(plugin, query);

        const records = parseCsv(csv.replace(/\r/g, '').trim(), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        }) as any[];

        Logger.log(`[getBalanceEntries] Parsed ${records.length} balance rows`);

        let balances: any[] = records.map((row: any) => {
            const amountStr = (row['amount'] || '').trim();
            const amountParts = amountStr.split(/\s+/);
            const amount = amountParts.length >= 2 ? amountParts[0] : '';
            const currency = amountParts.length >= 2 ? amountParts[1] : '';
            return {
                id: `balance_${row['date']}_${row['account'].replace(/:/g, '_')}`,
                type: 'balance',
                date: row['date'],
                account: row['account'],
                amount,
                currency,
                tolerance: row['tolerance'] || null,
                diff_amount: row['discrepancy'] || null,
                metadata: {},
            };
        });

        // Re-sort only when an in-memory filter disrupted BQL ORDER BY
        if (filters.searchTerm) {
            balances.sort((a, b) => {
                const d = b.date.localeCompare(a.date);
                return d !== 0 ? d : a.account.localeCompare(b.account);
            });
        }

        const totalCount = balances.length;
        const offset = (page - 1) * pageSize;
        const paginatedBalances = balances.slice(offset, offset + pageSize);

        return {
            entries: paginatedBalances,
            total_count: totalCount,
            returned_count: paginatedBalances.length,
            offset,
            limit: pageSize,
            has_more: offset + paginatedBalances.length < totalCount,
        };
    } catch (error) {
        Logger.error('[getBalanceEntries] Error:', error);
        throw error;
    }
}

// --- NOTE ENTRIES ---

/**
 * Fetches note entries from Beancount using BQL.
 */
export async function getNoteEntries(
    plugin: BeancountPlugin,
    filters: any = {},
    page: number = 1,
    pageSize: number = 200
): Promise<any> {
    try {
        Logger.log('[getNoteEntries] Fetching with filters:', filters);

        const whereConditions: string[] = [];
        if (filters.startDate) whereConditions.push(`date >= ${filters.startDate}`);
        if (filters.endDate) whereConditions.push(`date <= ${filters.endDate}`);
        if (filters.account) whereConditions.push(`account ~ "${filters.account}"`);

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const query = `SELECT date, account, comment, tags, links, meta FROM #notes ${whereClause} ORDER BY date DESC, account`;

        Logger.log('[getNoteEntries] Running BQL query:', query);
        const csv = await runQuery(plugin, query);

        const records = parseCsv(csv.replace(/\r/g, '').trim(), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        }) as any[];

        Logger.log(`[getNoteEntries] Parsed ${records.length} note rows`);

        let notes: any[] = records.map((row: any) => {
            const metaStr = row['meta'] || '{}';
            let metadata: Record<string, any> = {};
            try {
                metadata = JSON.parse(metaStr);
            } catch {
                metadata = { raw: metaStr };
            }
            return {
                id: `note_${row['date']}_${row['account'].replace(/:/g, '_')}`,
                type: 'note',
                date: row['date'],
                account: row['account'],
                comment: row['comment'] || '',
                metadata,
            };
        });

        // Re-sort only when an in-memory filter disrupted BQL ORDER BY
        if (filters.searchTerm) {
            notes.sort((a, b) => {
                const d = b.date.localeCompare(a.date);
                return d !== 0 ? d : a.account.localeCompare(b.account);
            });
        }

        const totalCount = notes.length;
        const offset = (page - 1) * pageSize;
        const paginatedNotes = notes.slice(offset, offset + pageSize);

        return {
            entries: paginatedNotes,
            total_count: totalCount,
            returned_count: paginatedNotes.length,
            offset,
            limit: pageSize,
            has_more: offset + paginatedNotes.length < totalCount,
        };
    } catch (error) {
        Logger.error('[getNoteEntries] Error:', error);
        throw error;
    }
}

// --- TRANSACTION ENTRIES ---

/**
 * Fetches transaction entries from Beancount using BQL, groups postings by transaction ID,
 * and returns a paginated JournalApiResponse.
 */
export async function getTransactionEntries(
    plugin: BeancountPlugin,
    filters: any = {},
    page: number = 1,
    pageSize: number = 200
): Promise<any> {
    try {
        Logger.log('[getTransactionEntries] Fetching with filters:', filters);

        const whereConditions: string[] = [];
        if (filters.startDate) whereConditions.push(`date >= ${filters.startDate}`);
        if (filters.endDate) whereConditions.push(`date <= ${filters.endDate}`);
        // Account filter applied in-memory after grouping
        if (filters.payee) whereConditions.push(`payee ~ "${filters.payee}"`);
        if (filters.tag) whereConditions.push(`"${filters.tag}" IN tags`);

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const query = `SELECT id, date, flag, payee, narration, tags, links, filename, lineno, account, number, currency, cost_number, cost_currency, cost_date, price, entry.meta as entry_meta FROM postings ${whereClause} ORDER BY date DESC, id, account`;

        Logger.log('[getTransactionEntries] Running BQL query:', query);
        const csv = await runQuery(plugin, query);

        const records = parseCsv(csv.replace(/\r/g, '').trim(), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        }) as any[];

        Logger.log(`[getTransactionEntries] Parsed ${records.length} posting rows`);

        // Group postings by transaction ID
        const transactionsMap = new Map<string, any>();

        for (const row of records) {
            const txnId = row['id'];

            if (!transactionsMap.has(txnId)) {
                const tagsStr = row['tags'] || '';
                const linksStr = row['links'] || '';
                const tags = tagsStr.trim() ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
                const links = linksStr.trim() ? linksStr.split(',').map((l: string) => l.trim()).filter(Boolean) : [];

                const entryMetaStr = row['entry_meta'] || '{}';
                let metadata: Record<string, any> = {};
                try { metadata = JSON.parse(entryMetaStr); } catch { metadata = { raw: entryMetaStr }; }

                if (row['filename']) metadata['filename'] = row['filename'];
                if (row['lineno']) {
                    const n = parseInt(row['lineno']);
                    if (!isNaN(n)) metadata['lineno'] = n;
                }

                transactionsMap.set(txnId, {
                    id: txnId,
                    type: 'transaction',
                    date: row['date'],
                    flag: row['flag'] || '*',
                    payee: row['payee'] || null,
                    narration: row['narration'] || '',
                    tags,
                    links,
                    metadata,
                    postings: [],
                });
            }

            const transaction = transactionsMap.get(txnId);
            const posting: any = {
                account: row['account'],
                amount: row['number'] || null,
                currency: row['currency'] || null,
                flag: null,
                comment: null,
                metadata: {},
            };

            if (row['cost_number'] || row['cost_currency']) {
                posting.cost = {
                    number: row['cost_number'] || null,
                    currency: row['cost_currency'] || null,
                    date: row['cost_date'] || null,
                    label: null,
                    isTotal: false,
                };
            }

            const priceStr = row['price'];
            if (priceStr?.trim()) {
                const priceParts = priceStr.trim().split(/\s+/);
                if (priceParts.length >= 2) {
                    posting.price = { amount: priceParts[0], currency: priceParts[1], isTotal: false };
                }
            }

            transaction.postings.push(posting);
        }

        let transactions = Array.from(transactionsMap.values());

        // In-memory account filter — applied after grouping so whole transactions are pulled
        if (filters.account) {
            const accountPattern = filters.account;
            transactions = transactions.filter((txn: any) =>
                txn.postings.some((p: any) => {
                    try { return new RegExp(accountPattern).test(p.account); }
                    catch { return p.account?.includes(accountPattern); }
                })
            );
        }

        // In-memory search term filter
        if (filters.searchTerm) {
            const q = filters.searchTerm.toLowerCase();
            transactions = transactions.filter((txn: any) =>
                txn.narration?.toLowerCase().includes(q) ||
                txn.payee?.toLowerCase().includes(q) ||
                txn.postings.some((p: any) => p.account?.toLowerCase().includes(q))
            );
        }

        // Re-sort only when in-memory filters were applied
        if (filters.account || filters.searchTerm) {
            transactions.sort((a: any, b: any) => {
                const d = b.date.localeCompare(a.date);
                return d !== 0 ? d : a.id.localeCompare(b.id);
            });
        }

        const totalCount = transactions.length;
        const offset = (page - 1) * pageSize;
        const paginatedTransactions = transactions.slice(offset, offset + pageSize);

        return {
            entries: paginatedTransactions,
            total_count: totalCount,
            returned_count: paginatedTransactions.length,
            offset,
            limit: pageSize,
            has_more: offset + paginatedTransactions.length < totalCount,
        };
    } catch (error) {
        Logger.error('[getTransactionEntries] Error:', error);
        throw error;
    }
}
