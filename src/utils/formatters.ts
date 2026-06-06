// src/utils/formatters.ts
// Pure data-formatting helpers: amounts, currencies, dates, metadata strings, debounce.

import { Logger } from './logger';

// --- AMOUNT PARSERS ---

/**
 * Extracts the numeric amount for a specific currency from a multi-currency inventory string.
 */
export function extractConvertedAmountNumber(inventoryString: string, targetCurrency: string): number {
    const regex = new RegExp(`(-?[\\d,]+\\.?\\d*)\\s*${targetCurrency}`);
    const match = inventoryString.match(regex);
    if (match) {
        return parseFloat(match[1].replace(/,/g, '')) || 0;
    }
    return 0;
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
