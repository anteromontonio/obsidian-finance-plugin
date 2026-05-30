---
sidebar_position: 3
---

# Journal Tab

The **Journal Tab** provides a comprehensive chronological log of every directive inside your ledger—similar to the interface offered by Fava.

---

## 📋 Features

### Complete Entry Stream
Unlike the Transactions tab which focuses solely on postings, the Journal view displays **all** Beancount directive types in a unified stream:
*   **Transactions**: Standard double-entry entries.
*   **Notes**: Informational text notes attached to accounts.
*   **Balance Assertions**: Reconciliations asserting account balances.
*   **Other Directives**: Events, commodity declarations, document linkages, etc.

### Full Management Capabilities
*   **View Details**: Click any card/entry to expand it and see full metadata, tags, and file locations.
*   **Edit**: Click the edit button (or right-click) to open the directive in the transaction modal or editor.
*   **Delete**: Safely delete directives directly from the stream (requires confirmation).
*   **Live Search**: Instantly filters entries as you type in the search bar.

### Advanced Filtering
*   **Date Range**: Filter entries by start and end dates.
*   **Account Filter**: Display only entries involving a specific account subtree.
*   **Entry Type**: Toggle checkboxes to show/hide specific directive types (Transactions, Notes, Balances).

---

## 🔍 Behind the Scenes: BQL Queries

The Journal tab executes three queries in parallel and merges the results client-side, sorting them chronologically:

### 1. Transaction Postings Query
```sql
SELECT id, date, flag, payee, narration, tags, links, filename, lineno, account, number, currency, cost_number, cost_currency, cost_date, price, entry.meta as entry_meta FROM postings ORDER BY date DESC, id, account
```
*Note: Postings sharing the same transaction `id` are grouped back together client-side into single transaction cards.*

### 2. Balance Assertions Query
```sql
SELECT date, account, amount, tolerance, discrepancy FROM #balances ORDER BY date DESC, account
```

### 3. Note Entries Query
```sql
SELECT date, account, comment, tags, links, meta FROM #notes ORDER BY date DESC, account
```
