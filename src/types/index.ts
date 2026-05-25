// src/types/index.ts
// Re-exporting models for backward compatibility
export * from '../models/account';
export * from '../models/journal';

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


