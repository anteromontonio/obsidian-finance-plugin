// src/models/indicator.ts
// Shared types for budget/target indicator directives.

/**
 * Represents a parsed indicator directive (budget or target).
 * This interface mirrors the `IndicatorItem` shape used in IndicatorsSection.svelte.
 */
export interface IndicatorItem {
    name: string;
    accountString?: string;
    accountQuery?: string;
    period?: string;
    cycle?: string;
    isRollOver?: boolean;
    isRollover?: boolean;
    targetAmount?: number;
    target?: number;
    currency: string;
    startDate?: string;
    tag?: string;
    tagMode?: 'has' | 'not_has';
    type?: 'Budget' | 'Target';
    filename?: string;
    lineno?: number;
}
