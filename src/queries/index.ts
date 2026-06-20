// src/queries/index.ts

// --- Types for Filters (Optional but helpful) ---
/**
 * Filters for transaction queries.
 */
export interface TransactionFilters {
	/** Filter by account name substring. */
	account?: string | null;
	/** Filter by start date (YYYY-MM-DD). */
	startDate?: string | null;
	/** Filter by end date (YYYY-MM-DD). */
	endDate?: string | null;
	/** Filter by payee name substring. */
	payee?: string | null;
	/** Filter by tag (e.g. "#tag"). */
	tag?: string | null;
}

// --- Query Functions ---


export function getTotalAssetsQuery(currency: string, rounding: number): string {
	return `SELECT round(number(only('${currency}', convert(sum(position), '${currency}'))), ${rounding}) AS _totalAssets WHERE account ~ '^Assets'`;
}

export function getTotalLiabilitiesQuery(currency: string, rounding: number): string {
	return `SELECT neg(round(number(only('${currency}', convert(sum(position), '${currency}'))), ${rounding})) AS _totalLiabilities WHERE account ~ '^Liabilities'`;
}

export function getTotalWorthQuery(currency: string, rounding: number): string {
	return `SELECT round(number(only('${currency}', convert(sum(position), '${currency}'))), ${rounding}) AS _totalWorth WHERE account ~ '^(Assets|Liabilities)'`;
}

// This Month Queries
export function getThisMonthIncomeQuery(currency: string, rounding: number): string {
	return `SELECT neg(round(number(only('${currency}', convert(sum(position), '${currency}'))), ${rounding})) AS _thisMonthIncome WHERE account ~ '^Income' AND month=month(today()) AND year=year(today())`;
}

export function getThisMonthExpensesQuery(currency: string, rounding: number): string {
	return `SELECT round(number(only('${currency}', convert(sum(position), '${currency}'))), ${rounding}) AS _thisMonthExpenses WHERE account ~ '^Expenses' AND month=month(today()) AND year=year(today())`;
}

export function getThisMonthSavingsQuery(currency: string, rounding: number): string {
	return `SELECT neg(round(number(only('${currency}', convert(sum(position), '${currency}'))), ${rounding})) AS _thisMonthNetWorthChange WHERE account ~ '^(Income|Expenses)' AND month=month(today()) AND year=year(today())`;
}

export function getBalanceSheetQuery(currency: string): string {
	return `SELECT account, convert(sum(position), '${currency}') WHERE account ~ '^(Assets|Liabilities|Equity)' AND NOT close_date(account) GROUP BY account ORDER BY account`;
}

export function getBalanceSheetQueryByCost(): string {
	return `SELECT account, cost(sum(position)) WHERE account ~ '^(Assets|Liabilities|Equity)' AND NOT close_date(account) GROUP BY account ORDER BY account`;
}

export function getBalanceSheetQueryByUnits(): string {
	return `SELECT account, units(sum(position)) WHERE account ~ '^(Assets|Liabilities|Equity)' AND NOT close_date(account) GROUP BY account ORDER BY account`;
}


export function getIncomeStatementQuery(currency: string): string {
	return `SELECT account, convert(sum(position), '${currency}') WHERE account ~ '^(Income|Expenses)' AND NOT close_date(account) GROUP BY account ORDER BY account`;
}

export function getIncomeStatementQueryByCost(): string {
	return `SELECT account, cost(sum(position)) WHERE account ~ '^(Income|Expenses)' AND NOT close_date(account) GROUP BY account ORDER BY account`;
}

export function getIncomeStatementQueryByUnits(): string {
	return `SELECT account, units(sum(position)) WHERE account ~ '^(Income|Expenses)' AND NOT close_date(account) GROUP BY account ORDER BY account`;
}

export function getTransactionsQuery(filters: TransactionFilters, limit = 1000): string {
	const selectPart = `SELECT date, payee, narration, position, balance`; // Added balance column
	const whereClauses: string[] = [];
	const orderByPart = `ORDER BY date DESC, lineno DESC LIMIT ${limit}`;

	// Build WHERE clauses based on provided filters
	if (filters.account) {

		whereClauses.push(`account ~ '^${filters.account}'`);
	}
	if (filters.startDate) {
		whereClauses.push(`date >= ${filters.startDate}`);
	}
	if (filters.endDate) {
		whereClauses.push(`date <= ${filters.endDate}`);
	}
	if (filters.payee && filters.payee.trim() !== '') {
		whereClauses.push(`payee ~ '${filters.payee.replace(/'/g, "''")}'`);
	}
	if (filters.tag && filters.tag.trim() !== '') {
		const tagName = filters.tag.replace(/^#/, '').trim().replace(/'/g, "''");
		if (tagName) {
			whereClauses.push(`'${tagName}' IN tags`); // Check tag presence
		}
	}

	// Construct the final query
	if (whereClauses.length > 0) {
		return `${selectPart} WHERE ${whereClauses.join(' AND ')} ${orderByPart}`;
	} else {
		return `${selectPart} ${orderByPart}`; // No WHERE needed
	}
}

export function getBeanCheckCommand(filePath: string, commandBase: string): string {
	// Use bean-query with ERRORS query to get validation errors
	// This keeps the plugin dependent only on bean-query
	// Note: Don't use -f csv flag as ERRORS returns formatted text
	return `${commandBase} "${filePath}" "ERRORS"`;
}

export function getHistoricalNetWorthDataQuery(interval: 'month' | 'week' = 'month', currency: string): string {
	if (interval === 'week') {
		return `SELECT last(date_add(date_trunc('week', date), 6)) AS week_end, only('${currency}', convert(last(balance), '${currency}', last(date_add(date_trunc('week', date), 6)))) WHERE account ~ '^(Assets|Liabilities)' GROUP BY date_trunc('week', date) ORDER BY week_end`;
	}
	return `SELECT year, month, only('${currency}', convert(last(balance), '${currency}', last(date_add(date(year + int(month/12), (month%12+1), 1), -1)))) WHERE account ~ '^(Assets|Liabilities)' GROUP BY year, month ORDER BY year, month`;
}


export function getHistoricalNetProfitDataQuery(interval: 'month' | 'week' = 'month', currency: string): string {
	if (interval === 'week') {
		return `SELECT last(date_add(date_trunc('week', date), 6)) AS week_end, only('${currency}', convert(sum(position), '${currency}', last(date_add(date_trunc('week', date), 6)))) WHERE account ~ '^(Income|Expenses)' GROUP BY date_trunc('week', date) ORDER BY week_end`;
	}
	return `SELECT year, month, only('${currency}', convert(sum(position), '${currency}', last(date_add(date(year + int(month/12), (month%12+1), 1), -1)))) AS _worth WHERE account ~ '^(Income|Expenses)' GROUP BY year, month ORDER BY year, month`;
}

export function getHistoricalExpenseDataQuery(interval: 'month' | 'week' = 'month', currency: string): string {
	if (interval === 'week') {
		return `SELECT last(date_add(date_trunc('week', date), 6)) AS week_end, only('${currency}', convert(sum(position), '${currency}', last(date_add(date_trunc('week', date), 6)))) WHERE account ~ '^(Expenses)' GROUP BY date_trunc('week', date) ORDER BY week_end`;
	}
	return `SELECT year, month, only('${currency}', convert(sum(position), '${currency}', last(date_add(date(year + int(month/12), (month%12+1), 1), -1)))) AS _worth WHERE account ~ '^(Expenses)' GROUP BY year, month ORDER BY year, month`;
}

export function getHistoricalIncomeDataQuery(interval: 'month' | 'week' = 'month', currency: string): string {
	if (interval === 'week') {
		return `SELECT last(date_add(date_trunc('week', date), 6)) AS week_end, only('${currency}', convert(sum(position), '${currency}', last(date_add(date_trunc('week', date), 6)))) WHERE account ~ '^(Income)' GROUP BY date_trunc('week', date) ORDER BY week_end`;
	}
	return `SELECT year, month, only('${currency}', convert(sum(position), '${currency}', last(date_add(date(year + int(month/12), (month%12+1), 1), -1)))) AS _worth WHERE account ~ '^(Income)' GROUP BY year, month ORDER BY year, month`;
}
// --- List Budget/Target Quries ---	
export function getBudgetListQuery(): string {
	return `SELECT date AS _startDate, meta('name') AS _name, meta('accountQuery') AS _accountString, meta('cycle') AS _period, bool(meta('isRollover')) AS _isRollOver, meta('target') AS _budgetAmount, meta('currency') AS _currency, meta('tag') AS _tag, meta('tagMode') AS _tagMode, meta('filename') AS _filename, meta('lineno') AS _lineno FROM events WHERE type='Indicator' AND description='Budget'`;
}

export function getTargetListQuery(): string {
	return `SELECT date AS _startDate, meta('name') AS _name, meta('accountQuery') AS _accountString, meta('cycle') AS _period, bool(meta('isRollover')) AS _isRollOver, meta('target') AS _targetAmount, meta('currency') AS _currency, meta('tag') AS _tag, meta('tagMode') AS _tagMode, meta('filename') AS _filename, meta('lineno') AS _lineno FROM events WHERE type='Indicator' AND description='Target'`;
}


// --- Budget/Target Queries ---

/**
 * Returns the total of postings to the indicator's account that fall within
 * the CURRENT cycle (week / month / quarter / year), aggregated into ONE row.
 *
 * Design notes:
 *   - The previous implementation for rollover indicators grouped by
 *     (year, month) and returned `ORDER BY ... DESC LIMIT 1`. That subtly
 *     broke when the current cycle had no postings yet: the LIMIT 1 would
 *     return the most recent PAST cycle's row, so `_expenseThisCycle`
 *     reflected last cycle's spending displayed as if it were this cycle's.
 *   - The new query has no non-aggregate columns in SELECT, so bean-query
 *     produces exactly one aggregated row (or zero rows if there are no
 *     matching postings). That eliminates the wrong-cycle-row class of bugs.
 *   - For rollover indicators we no longer compute `_remainingThisCycle` in
 *     SQL — the client recomputes it from `getIndicatorBalanceQuery` so the
 *     no-postings-ever case (which previously returned zero SQL rows and
 *     therefore zero rollover) is handled correctly.
 */
export function getIndicatorStatusQuery(currency: string, accountString: string, period: string, tag?: string | null, tagMode?: 'has' | 'not_has'): string {
	// Tag filter: optional, can either require a tag (#tag IN tags) or exclude one (NOT IN tags).
	// Strip a leading '#' if the user typed it; escape single quotes by doubling per bean-query string literal rules.
	const sanitizedTag = tag ? tag.trim().replace(/^#/, '').replace(/'/g, "''") : '';
	const tagClause = sanitizedTag
		? (tagMode === 'not_has' ? `NOT '${sanitizedTag}' IN tags` : `'${sanitizedTag}' IN tags`)
		: '';
	// Aggregate-only SELECT → single row.
	//   `sum(position)` totals all matching postings into a multi-currency inventory.
	//   `convert(..., currency)` reduces that inventory to the indicator's display currency.
	//   `only(currency, ...)` extracts the numeric leg in that currency.
	//   `number(...)` strips the currency tag so the CSV value is a plain number.
	// The `date_trunc(period, date) = date_trunc(period, today())` filter restricts
	// the sum to postings whose cycle bucket matches today's cycle bucket — i.e. THIS cycle.
	return `SELECT number(only('${currency}', convert(sum(position), '${currency}'))) AS _expenseThisCycle WHERE account ~ '^${accountString}' AND date_trunc('${period}', date)=date_trunc('${period}', today())${tagClause ? ` AND ${tagClause}` : ''}`;
}

/**
 * Returns the cumulative balance of postings to the account on or after
 * `startDate`, aggregated into ONE row. Used by rollover indicators to derive
 * `remaining = elapsedCycles * targetAmount - balance` on the client.
 *
 * Why this exists as a separate query:
 *   - Rollover semantics need TWO different aggregation scopes in one report:
 *       (a) current-cycle expense (filtered to today's cycle)
 *       (b) total accumulated balance since the indicator started
 *     bean-query doesn't combine those two scopes cleanly in a single SELECT,
 *     so we run two queries and combine the values client-side.
 *   - `sum(position)` over all postings since `startDate` is equivalent to
 *     `last(balance)` for accounts that don't carry an opening inventory,
 *     which is the case for every account a budget/target would target
 *     (expenses for budgets, assets for savings targets).
 */
export function getIndicatorBalanceQuery(currency: string, accountString: string, startDate: string, tag?: string | null, tagMode?: 'has' | 'not_has'): string {
	// Same tag-clause handling as in getIndicatorStatusQuery — kept inline rather than
	// extracted to keep each query function self-contained and easy to read in isolation.
	const sanitizedTag = tag ? tag.trim().replace(/^#/, '').replace(/'/g, "''") : '';
	const tagClause = sanitizedTag
		? (tagMode === 'not_has' ? `NOT '${sanitizedTag}' IN tags` : `'${sanitizedTag}' IN tags`)
		: '';
	// `date >= ${startDate}` uses bean-query's date-literal syntax (unquoted YYYY-MM-DD),
	// matching the pattern already used elsewhere in this file (see `getTransactionsQuery`).
	return `SELECT number(only('${currency}', convert(sum(position), '${currency}'))) AS _balance WHERE account ~ '^${accountString}' AND date>=${startDate}${tagClause ? ` AND ${tagClause}` : ''}`;
}



// --- Commodities Queries ---

function escapeBqlString(value: string): string {
	return value.replace(/'/g, "''");
}

export function getAllCommoditiesQuery(): string {
	return `SELECT name AS name_ FROM #commodities GROUP BY name`;
}

export function getCommoditiesPriceDataQuery(currency: string): string {
	const safeCurrency = escapeBqlString(currency);
	return `SELECT last(date) AS date_, last(currency) AS currency_, currency_meta(last(currency), 'name') AS displayname_, round(getprice(last(currency), '${safeCurrency}'),2) AS price_, currency_meta(last(currency), 'logo') AS logo_, bool(today()-1<last(date)) AS islatest_ FROM #prices GROUP BY currency`;
}



/**
 * Combined holdings query: all data needed to populate the commodity tab in one pass.
 * For each currency held in Asset accounts, returns:
 *   - currency_  : commodity symbol (e.g. "DOGE")
 *   - displayname_: human-readable display name from commodity metadata
 *   - units_     : raw inventory string (e.g. "65.64 DOGE")
 *   - valueOp_   : holdings converted to operating currency (e.g. "658.37 INR")
 *   - price_     : latest price in operating currency (e.g. 10.03)
 *   - logo_      : logo URL from commodity metadata
 */
export function getCombinedCommodityDataQuery(operatingCurrency: string): string {
	const safeOperatingCurrency = escapeBqlString(operatingCurrency);
	return `SELECT currency AS currency_, currency_meta(last(currency), 'name') AS displayname_, units(sum(position)) AS units_, convert(sum(position), '${safeOperatingCurrency}') AS valueOp_, round(getprice(last(currency), '${safeOperatingCurrency}'), 2) AS price_, currency_meta(last(currency), 'logo') AS logo_ WHERE account ~ '^Assets' GROUP BY currency`;
}


export function getCommodityDetailsQuery(symbol: string): string {
	const safeSymbol = escapeBqlString(symbol);
	return `SELECT name AS name_, currency_meta(last(name), 'name') AS displayname_, last(meta) AS meta_, currency_meta(last(name),'logo') AS logo_, currency_meta(last(name), 'price') AS pricemetadata_, meta('filename') AS filename_, meta('lineno') AS lineno_ FROM #commodities WHERE name='${safeSymbol}'`;
}

export function getCommodityPriceHistoryQuery(symbol: string): string {
	const safeSymbol = escapeBqlString(symbol);
	return `SELECT date AS date_, amount AS amount_ FROM #prices WHERE currency='${safeSymbol}' ORDER BY date`;
}

// --- Price Queries ---

export function getAllCurrenciesQuery(): string {
	return `SELECT distinct(currency) AS currency_`;
}
