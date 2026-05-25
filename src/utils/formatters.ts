// src/utils/formatters.ts
// Pure data-formatting helpers: amounts, currencies, dates, metadata strings, debounce.

import { parse as parseCsv } from 'csv-parse/sync';
import { Logger } from './logger';

// --- SINGLE-VALUE CSV PARSER ---

/**
 * Parses a single value from a CSV response (typically from a simple SELECT query).
 *
 * @param {string} csv - The raw CSV string from bean-query.
 * @returns {string} The parsed single value (e.g. "100.00 USD") or "0 USD" on failure.
 */
export function parseSingleValue(csv: string): string {
    if (!csv || typeof csv !== 'string') return '0 USD';

    const cleanCsv = csv.replace(/\r/g, '').trim();
    if (!cleanCsv) return '0 USD';

    try {
        const records = parseCsv(cleanCsv, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        }) as any[];

        if (!records || records.length === 0) return '0 USD';

        const firstRecord = records[0];
        if (!firstRecord) return '0 USD';

        const values = Object.values(firstRecord);
        if (values.length === 0) return '0 USD';

        const rawValue = String(values[0] ?? '').trim();
        if (!rawValue) return '0 USD';

        // Handle inventory strings: strip outer parens/brackets
        const cleanValue = rawValue.replace(/^[({[]/g, '').replace(/[)}\]]/g, '').trim();
        return cleanValue || '0 USD';
    } catch {
        // Try raw line extraction as fallback
        const lines = cleanCsv.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
            return lines[1].trim();
        }
        return '0 USD';
    }
}

// --- AMOUNT PARSERS ---

/**
 * Parses a string amount into a numeric value and currency.
 *
 * @param {string} amountString - e.g. "1,234.56 USD"
 */
export function parseAmount(amountString: string): { amount: number; currency: string } {
    const defaultValue = { amount: 0, currency: 'USD' };
    if (!amountString || typeof amountString !== 'string') return defaultValue;

    const match = amountString.match(/(-?[\d,]+(?:\.\d+)?)\s*(\S+)/);
    if (match) {
        try {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            const currency = match[2];
            return { amount: isNaN(amount) ? 0 : amount, currency: currency || 'USD' };
        } catch (e) {
            Logger.error('Error parsing amount:', e, 'String:', amountString);
            return defaultValue;
        }
    }
    Logger.warn('Could not parse amount string:', amountString);
    return defaultValue;
}

/**
 * Extracts the amount for a specific currency from a multi-currency inventory string.
 */
export function extractConvertedAmount(inventoryString: string, targetCurrency: string): string {
    const regex = new RegExp(`(-?[\\d,]+\\.?\\d*)\\s*${targetCurrency}`);
    const match = inventoryString.match(regex);
    if (match) {
        return `${match[1]} ${targetCurrency}`;
    }
    return `0.00 ${targetCurrency}`;
}

/**
 * Extracts amounts for all currencies EXCEPT the operating currency.
 */
export function extractNonReportingCurrencies(inventoryString: string, operatingCurrency: string): string {
    const currencyRegex = /(-?[\d,]+\.?\d*)\s*([A-Z]{3,4})/g;
    const matches: string[] = [];
    let match;

    while ((match = currencyRegex.exec(inventoryString)) !== null) {
        const amount = match[1];
        const currency = match[2];
        if (currency !== operatingCurrency) {
            const numAmount = parseFloat(amount.replace(/,/g, ''));
            if (numAmount !== 0) {
                matches.push(`${amount} ${currency}`);
            }
        }
    }
    return matches.join('\n');
}

// --- CURRENCY FORMATTER ---

/**
 * Formats a number as a currency string (e.g. "1,234.56 USD").
 */
export function formatCurrency(amount: number, currency: string): string {
    if (isNaN(amount)) return `0.00 ${currency}`;
    return `${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    })} ${currency}`;
}

// --- DATE HELPER ---

/**
 * Gets the ISO start/end date strings for the current calendar month.
 */
export function getCurrentMonthRange(): { start: string; end: string } {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) };
}

// --- METADATA PARSER ---

/**
 * Parses a BQL metadata dictionary string (e.g. "{'key': 'value'}") into a plain object.
 * Handles empty dicts and malformed strings gracefully.
 */
export function parseMetadataString(metaStr: string): Record<string, any> {
    try {
        if (!metaStr || metaStr.trim() === '{}' || metaStr.trim() === '') return {};
        // Convert BQL single-quotes to JSON double-quotes
        const jsonStr = metaStr.replace(/'/g, '"').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        Logger.warn('Failed to parse metadata string:', metaStr, e);
        return {};
    }
}

// --- DEBOUNCE ---

/**
 * Creates a debounced version of a function.
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}
