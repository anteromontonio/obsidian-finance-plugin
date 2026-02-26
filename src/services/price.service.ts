// src/services/price.service.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type BeancountPlugin from '../main';
import type { PriceFetchResult } from '../types';
import { getTargetFile, getMainLedgerPath } from '../utils/structuredLayout';
import { convertWslPathToWindows } from '../utils';
import { Logger } from '../utils/logger';
import { SystemDetector } from '../utils/SystemDetector';

const execAsync = promisify(exec);

/**
 * PriceService
 *
 * Fetches all commodity prices in one shot by running:
 *   bean-price <ledger.beancount>
 *
 * bean-price reads the ledger, discovers all commodities that have a
 * `price:` metadata entry, fetches their current prices from the
 * configured sources, and prints ready-to-use Beancount price directives
 * to stdout.  We filter those lines out of the output and append them
 * to prices.beancount.
 *
 * stderr from bean-price is informational only (e.g. balance-check
 * warnings) and is logged but never treated as a failure.
 */
export class PriceService {
	private plugin: BeancountPlugin;

	constructor(plugin: BeancountPlugin) {
		this.plugin = plugin;
	}

	// ------------------------------------------------------------------ //
	//  Public API
	// ------------------------------------------------------------------ //

	/**
	 * Runs `bean-price <ledger>`, captures price directives from stdout,
	 * deduplicates them against the existing prices.beancount content,
	 * and appends any new ones.
	 */
	public async fetchAndSavePrices(): Promise<PriceFetchResult> {
		Logger.log('[PriceService] fetchAndSavePrices — starting');

		// 1. Resolve the bean-price executable
		const beanPriceCommand = await this.resolveBeanPriceCommand();
		if (!beanPriceCommand) {
			return this.failResult('bean-price command not configured or not found. Please run auto-detect in settings.');
		}

		// 2. Resolve the main ledger path
		const ledgerPath = getMainLedgerPath(this.plugin);
		if (!ledgerPath || !existsSync(ledgerPath)) {
			return this.failResult(`Ledger file not found: ${ledgerPath}`);
		}

		// 3. Resolve prices.beancount path
		const pricesFilePath = getTargetFile(this.plugin, 'price');
		if (!pricesFilePath) {
			return this.failResult('Could not determine prices.beancount path from plugin settings.');
		}

		// 4. Run bean-price on the entire ledger (one command, all commodities)
		const command = `${beanPriceCommand} "${ledgerPath}"`;
		Logger.log(`[PriceService] Executing: ${command}`);

		let stdout = '';
		let stderr = '';
		try {
			const result = await Promise.race([
				execAsync(command, { maxBuffer: 20 * 1024 * 1024 }),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Timeout: bean-price took longer than 60 seconds')), 60_000)
				),
			]) as { stdout: string; stderr: string };
			stdout = result.stdout;
			stderr = result.stderr;
		} catch (err: any) {
			// bean-price exits non-zero when there are balance errors in the
			// ledger — stdout may still contain valid price directives.
			stdout = err.stdout ?? '';
			stderr = err.stderr ?? err.message ?? String(err);
		}

		// Log stderr for diagnostics but do NOT fail on it
		if (stderr.trim()) {
			Logger.log('[PriceService] bean-price stderr (informational):\n' + stderr.trim());
		}

		// 5. Extract price directives from stdout
		const newDirectives = this.extractPriceDirectives(stdout);
		Logger.log(`[PriceService] Found ${newDirectives.length} price directive(s) in bean-price output`);

		if (newDirectives.length === 0) {
			return {
				successful: [],
				failed: [],
				fetchedCount: 0,
				savedCount: 0,
			};
		}

		// 6. Deduplicate: skip any directive that is already in prices.beancount
		const existingContent = existsSync(pricesFilePath)
			? await readFile(pricesFilePath, 'utf-8')
			: '';

		const toAppend = newDirectives.filter(line => !existingContent.includes(line));
		Logger.log(`[PriceService] ${toAppend.length} new directive(s) to append (${newDirectives.length - toAppend.length} already present)`);

		// 7. Append new directives
		let savedCount = 0;
		if (toAppend.length > 0) {
			const separator = existingContent.endsWith('\n') ? '' : '\n';
			const appendText = separator + toAppend.join('\n') + '\n';
			await writeFile(pricesFilePath, existingContent + appendText, 'utf-8');
			savedCount = toAppend.length;
			Logger.log(`[PriceService] Appended ${savedCount} directive(s) to ${pricesFilePath}`);
		}

		// 8. Parse directives into PriceData for the result summary
		const successful = newDirectives.map(line => this.parseDirective(line)).filter(Boolean) as any[];

		return {
			successful,
			failed: [],
			fetchedCount: newDirectives.length,
			savedCount,
		};
	}

	// ------------------------------------------------------------------ //
	//  Private helpers
	// ------------------------------------------------------------------ //

	/**
	 * Filters stdout lines to only those that look like Beancount price
	 * directives: `YYYY-MM-DD price SYMBOL AMOUNT CURRENCY`
	 */
	private extractPriceDirectives(stdout: string): string[] {
		const priceLineRe = /^\d{4}-\d{2}-\d{2}\s+price\s+\S+\s+[\d.]+\s+\S+\s*$/;
		return stdout
			.split('\n')
			.map(l => l.trim())
			.filter(l => priceLineRe.test(l));
	}

	/**
	 * Parses a single price directive line into a PriceData object.
	 * Returns null if the line cannot be parsed.
	 */
	private parseDirective(line: string): { date: string; commodity: string; amount: number; currency: string } | null {
		// Format: YYYY-MM-DD price SYMBOL AMOUNT CURRENCY
		const match = line.match(/^(\d{4}-\d{2}-\d{2})\s+price\s+(\S+)\s+([\d.]+)\s+(\S+)/);
		if (!match) return null;
		return {
			date: match[1],
			commodity: match[2],
			amount: parseFloat(match[3]),
			currency: match[4],
		};
	}

	/**
	 * Returns the bean-price executable path from settings, or runs
	 * auto-detection if not yet configured.
	 */
	private async resolveBeanPriceCommand(): Promise<string | null> {
		if (this.plugin.settings.beanPriceCommand) {
			return this.plugin.settings.beanPriceCommand;
		}
		// Fall back to auto-detect
		const detector = SystemDetector.getInstance();
		const result = await detector.detectBeanPriceCommand();
		return result.isValid && result.command ? result.command : null;
	}

	/** Builds a zero-count failure result with a single error entry. */
	private failResult(error: string): PriceFetchResult {
		Logger.error('[PriceService]', error);
		return {
			successful: [],
			failed: [{ commodity: '*', source: '*', error }],
			fetchedCount: 0,
			savedCount: 0,
		};
	}
}
