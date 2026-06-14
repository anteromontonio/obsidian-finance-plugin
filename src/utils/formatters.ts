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


// --- METADATA PARSER ---

/**
 * Parses a BQL metadata dictionary string (e.g. "{'key': 'value'}") into a plain object.
 * Handles empty dicts and malformed strings gracefully.
 */
export function parseMetadataString(metaStr: string): Record<string, unknown> {
    try {
        if (!metaStr || metaStr.trim() === '{}' || metaStr.trim() === '') return {};
        // Convert BQL single-quotes to JSON double-quotes
        const jsonStr = metaStr.replace(/'/g, '"').trim();
        return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch (e) {
        Logger.warn('Failed to parse metadata string:', metaStr, e);
        return {};
    }
}

// --- DEBOUNCE ---

/**
 * Creates a debounced version of a function.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            window.clearTimeout(timeout);
        }
        timeout = window.setTimeout(later, wait);
    };
}
