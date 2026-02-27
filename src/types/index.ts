// src/types/index.ts
// Re-exporting models for backward compatibility
export * from '../models/account';
export * from '../models/journal';
export * from '../models/common';

// Convenience types for legacy callers
export interface Posting {
	account: string;
	amount: string;
	currency: string;
}

export interface TransactionData {
	type: 'transaction' | 'balance' | 'note';
	date: string;
	payee?: string;
	narration?: string;
	tag?: string;
	postings?: Posting[];
	account?: string;
	amount?: string;
	currency?: string;
	text?: string;
}

// Price-related types for bean-price integration
export interface PriceData {
	date: string;        // YYYY-MM-DD
	commodity: string;   // Symbol e.g., "AAPL"
	amount: number;      // Price value
	currency: string;    // Quote currency e.g., "USD"
}

export interface PriceFetchResult {
	successful: PriceData[];
	failed: Array<{ commodity: string, source: string, error: string }>;
	fetchedCount: number;
	savedCount: number;
}

export interface PriceFetchStatus {
	fetching: boolean;
	lastFetch?: {
		time: Date;
		result: PriceFetchResult;
	};
}
