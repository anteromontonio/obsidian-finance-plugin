// src/controllers/OverviewController.ts

import { writable, type Writable, get } from 'svelte/store';
import type BeancountPlugin from '../main';
import * as queries from '../queries/index';
import { Logger } from '../utils/logger';

export type OverviewPeriodMode = 'month' | 'year';
export type OverviewPeriodPreset = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom-month' | 'custom-year';

/**
 * Interface representing the state of the Overview dashboard.
 */
export interface OverviewState {
	/** Whether data is loading. */
	isLoading: boolean;
	/** Error message if loading failed. */
	error: string | null;
	/** Net worth string (e.g. "1,000.00 USD"). */
	netWorth: string;
	/** The reporting currency. */
	currency: string;
	/** Selected period preset. */
	periodPreset: OverviewPeriodPreset;
	/** Selected summary period granularity. */
	periodMode: OverviewPeriodMode;
	/** Selected period year. */
	periodYear: number;
	/** Selected period month, one-based. */
	periodMonth: number;
	/** Human-readable selected period label. */
	periodLabel: string;
	/** Period income string. */
	periodIncome: string;
	/** Period expenses string. */
	periodExpenses: string;
	/** Period net income string. */
	periodNetIncome: string;
	/** Period savings rate percentage string. */
	periodSavingsRate: string;
}

/**
 * OverviewController
 *
 * Manages the state and logic for the Overview tab.
 * Fetches high-level financial metrics (Net Worth, Income, Expenses) and
 * prepares data for the Net Worth over time chart.
 */
export class OverviewController {
	private plugin: BeancountPlugin;

	// Create a Svelte store to hold the state
	public state: Writable<OverviewState>;

	/**
	 * Creates an instance of OverviewController.
	 * @param {BeancountPlugin} plugin - The main plugin instance.
	 */
	constructor(plugin: BeancountPlugin) {
		this.plugin = plugin;
		const now = new Date();
		const defaultPreset = this.getDefaultPeriodPreset();
		const defaultPeriod = this.resolvePresetDate(defaultPreset, now);
		// Initialize the store with default values
		this.state = writable({
			isLoading: true,
			error: null,
			netWorth: '0.00 USD',
			currency: plugin.settings.operatingCurrency || 'USD',
			periodPreset: defaultPreset,
			periodMode: defaultPeriod.mode,
			periodYear: defaultPeriod.year,
			periodMonth: defaultPeriod.month,
			periodLabel: this.formatPeriodLabel(defaultPeriod.mode, defaultPeriod.year, defaultPeriod.month),
			periodIncome: '0.00 USD',
			periodExpenses: '0.00 USD',
			periodNetIncome: '0.00 USD',
			periodSavingsRate: '0%',
		});
	}

	/**
	 * Loads all overview data from Beancount.
	 * Fetches total assets, liabilities, monthly income/expenses, and historical data for the chart.
	 */
	async loadData() {
		this.state.update(s => ({ ...s, isLoading: true, error: null, chartError: null }));

		const reportingCurrency = this.plugin.settings.operatingCurrency;
		if (!reportingCurrency) {
			this.state.set({
				...get(this.state), // Svelte 4/5 way to get current value
				isLoading: false,
				error: "Operating currency is not set in plugin settings.",
			});
			return;
		}

		try {
			const period = this.getPeriodRange();
			const [netWorthResult, periodIncomeResult, periodExpensesResult, periodSavingsResult] = await Promise.all([
				this.plugin.runQuery(queries.getTotalWorthQuery(reportingCurrency, 2, period.endDate)),
				this.plugin.runQuery(queries.getPeriodIncomeQuery(reportingCurrency, 2, period.startDate, period.endDate)),
				this.plugin.runQuery(queries.getPeriodExpensesQuery(reportingCurrency, 2, period.startDate, period.endDate)),
				this.plugin.runQuery(queries.getPeriodSavingsQuery(reportingCurrency, 2, period.startDate, period.endDate)),
			]);

			// Process KPI Data
			Logger.log("OverviewController: Net Worth Result:", netWorthResult);
			const netWorthNum = this.parseNumericResult(netWorthResult);
			Logger.log("OverviewController: Parsed Net Worth:", netWorthNum);

			const newState: Partial<OverviewState> = {
				netWorth: `${netWorthNum.toFixed(2)} ${reportingCurrency}`,
				currency: reportingCurrency,
				periodLabel: period.label,
				...this.formatPeriodResults(periodIncomeResult, periodExpensesResult, periodSavingsResult, reportingCurrency),
			};

			// Update the store with KPI data
			this.state.update(s => ({ ...s, ...newState, isLoading: false, error: null }));

		} catch (e) {
			Logger.error("Error loading overview data:", e);
			const errMsg = e instanceof Error ? e.message : String(e);
			this.state.update(s => ({ ...s, isLoading: false, error: `Failed to load data: ${errMsg}` }));
		}
	}

	async setPeriodPreset(preset: OverviewPeriodPreset) {
		const now = new Date();
		const selected = this.resolvePresetDate(preset, now);

		this.state.update(s => ({
			...s,
			periodPreset: preset,
			periodMode: selected.mode,
			periodYear: selected.year,
			periodMonth: selected.month,
			periodLabel: this.formatPeriodLabel(selected.mode, selected.year, selected.month),
		}));
		await this.loadData();
	}

	async setPeriodYear(year: number) {
		const normalizedYear = Number.isFinite(year) ? Math.max(1, Math.trunc(year)) : new Date().getFullYear();
		this.state.update(s => ({
			...s,
			periodYear: normalizedYear,
			periodLabel: this.formatPeriodLabel(s.periodMode, normalizedYear, s.periodMonth),
		}));
		await this.loadData();
	}

	async setPeriodMonth(month: number) {
		const normalizedMonth = Number.isFinite(month) ? Math.min(12, Math.max(1, Math.trunc(month))) : new Date().getMonth() + 1;
		this.state.update(s => ({
			...s,
			periodMonth: normalizedMonth,
			periodLabel: this.formatPeriodLabel(s.periodMode, s.periodYear, normalizedMonth),
		}));
		await this.loadData();
	}

	private getPeriodRange() {
		const { periodMode, periodYear, periodMonth } = get(this.state);
		const year = Number.isFinite(periodYear) ? Math.max(1, Math.trunc(periodYear)) : new Date().getFullYear();
		const month = Number.isFinite(periodMonth) ? Math.min(12, Math.max(1, Math.trunc(periodMonth))) : new Date().getMonth() + 1;

		if (periodMode === 'year') {
			return {
				startDate: `${year}-01-01`,
				endDate: `${year + 1}-01-01`,
				label: this.formatPeriodLabel(periodMode, year, month),
			};
		}

		const nextYear = month === 12 ? year + 1 : year;
		const nextMonth = month === 12 ? 1 : month + 1;
		return {
			startDate: `${year}-${this.pad2(month)}-01`,
			endDate: `${nextYear}-${this.pad2(nextMonth)}-01`,
			label: this.formatPeriodLabel(periodMode, year, month),
		};
	}

	private formatPeriodLabel(mode: OverviewPeriodMode, year: number, month: number): string {
		if (mode === 'year') {
			return `${year}`;
		}
		return `${year}-${this.pad2(month)}`;
	}

	private parseNumericResult(csv: string): number {
		const lines = csv.split('\n').map(line => line.trim()).filter(Boolean);
		return parseFloat(lines[1]) || 0;
	}

	private formatCurrency(amount: number, currency: string): string {
		return `${amount.toFixed(2)} ${currency}`;
	}

	private formatPeriodResults(incomeCsv: string, expensesCsv: string, savingsCsv: string, currency: string): Partial<OverviewState> {
		const incomeAmount = this.parseNumericResult(incomeCsv);
		const expensesAmount = this.parseNumericResult(expensesCsv);
		const savingsAmount = this.parseNumericResult(savingsCsv);

		return {
			periodIncome: this.formatCurrency(incomeAmount, currency),
			periodExpenses: this.formatCurrency(expensesAmount, currency),
			periodNetIncome: this.formatCurrency(savingsAmount, currency),
			periodSavingsRate: incomeAmount > 0 ? `${((savingsAmount / incomeAmount) * 100).toFixed(0)}%` : 'N/A',
		};
	}

	private resolvePresetDate(preset: OverviewPeriodPreset, now: Date) {
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const current = this.state ? get(this.state) : { periodYear: year, periodMonth: month };

		switch (preset) {
			case 'last-month': {
				const lastMonthDate = new Date(year, month - 2, 1);
				return {
					mode: 'month' as const,
					year: lastMonthDate.getFullYear(),
					month: lastMonthDate.getMonth() + 1,
				};
			}
			case 'this-year':
				return { mode: 'year' as const, year, month };
			case 'last-year':
				return { mode: 'year' as const, year: year - 1, month };
			case 'custom-month':
				return { mode: 'month' as const, year: current.periodYear, month: current.periodMonth };
			case 'custom-year':
				return { mode: 'year' as const, year: current.periodYear, month: current.periodMonth };
			case 'this-month':
			default:
				return { mode: 'month' as const, year, month };
		}
	}

	private pad2(value: number): string {
		return String(value).padStart(2, '0');
	}

	private getDefaultPeriodPreset(): OverviewPeriodPreset {
		const preset = this.plugin.settings.dashboardDefaultPeriod;
		if (preset === 'last-month' || preset === 'this-year' || preset === 'last-year') {
			return preset;
		}
		return 'this-month';
	}
}
