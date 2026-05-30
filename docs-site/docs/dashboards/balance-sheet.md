---
sidebar_position: 4
---

# Balance Sheet Tab

The **Balance Sheet Tab** provides a snapshot of your financial position, showing what you own (Assets), what you owe (Liabilities), and the starting book value (Equity) at any point in time.

---

## 🏛 Features

### Double-Entry Balance
The balance sheet validates the fundamental accounting equation:
```
Assets + Liabilities + Equity = 0
```
*(Note: In Beancount, Liabilities and Equity are represented as negative numbers, so they sum directly to zero).*

### Valuation Methods
You can toggle the **Valuation** dropdown to view balances in three formats:
1.  **Market Value (Convert)**: Converts all holdings (including commodities like stocks or foreign currencies) to your operating currency at the latest recorded market prices using `convert()`.
2.  **At Cost**: Displays holdings at their original cost basis (acquisition cost) using `cost()`.
3.  **Units**: Displays raw counts (e.g. `50 AAPL`, `1.5 BTC`, `1000 USD`) using `units()`.

### Interactive Charts
The top portion of the tab provides:
*   **Net Worth Trend**: Interactive chart showing your historical net worth.
*   **Balances (Sunburst Chart)**: Visual sunburst diagram of either Assets, Liabilities, or Equity, allowing you to click and drill down into sub-accounts.

---

## 🔍 Behind the Scenes: BQL Queries

Each valuation method corresponds to a distinct BQL statement:

### Market Value
```sql
SELECT account, convert(sum(position), 'USD') WHERE account ~ '^(Assets|Liabilities|Equity)' AND NOT close_date(account) GROUP BY account ORDER BY account
```

### At Cost
```sql
SELECT account, cost(sum(position)) WHERE account ~ '^(Assets|Liabilities|Equity)' AND NOT close_date(account) GROUP BY account ORDER BY account
```

### Units
```sql
SELECT account, units(sum(position)) WHERE account ~ '^(Assets|Liabilities|Equity)' AND NOT close_date(account) GROUP BY account ORDER BY account
```
