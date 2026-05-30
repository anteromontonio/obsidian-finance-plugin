---
sidebar_position: 2
---

# Transactions Tab

The **Transactions Tab** allows you to explore and search through your entire posting history with interactive, dynamic filtering capabilities.

---

## 🔍 Features

### Dynamic Filtering
You can filter your transaction history by any combination of the following criteria:
*   **Date Range**: Start and End dates (inclusive) to isolate specific timeframes.
*   **Account**: Substring match on the account name (e.g. searching `Food` matches `Expenses:Food:Groceries` and `Expenses:Food:Restaurants`).
*   **Payee**: Searches the transaction payee field for matching text.
*   **Tags**: Filter transactions by specific hashtags (e.g., `#vacation`, `#business`).
*   **Search**: Full-text search across payee, narration, and comments.

### Results Table
*   **Columns**: Date, Payee, Narration, Amount, Account.
*   **Sorting**: Automatically sorted by date (newest first).
*   **Pagination**: Respects the "Max Transaction Results" setting in your performance preferences.
*   **Interactivity**: Click on any transaction row to open the editing view and make adjustments directly.

---

## 🔍 Behind the Scenes: BQL Queries

The Transactions tab uses dynamic query building based on your active filters:

### Base Query (All Transactions)
```sql
SELECT date, payee, narration, position, balance ORDER BY date DESC, lineno DESC LIMIT 1000
```

### With Filters Applied

**Account Filter:**
```sql
SELECT date, payee, narration, position, balance WHERE account ~ '^Assets:Checking' ORDER BY date DESC, lineno DESC LIMIT 1000
```

**Date Range Filter:**
```sql
SELECT date, payee, narration, position, balance WHERE date >= 2026-01-01 AND date <= 2026-12-31 ORDER BY date DESC, lineno DESC LIMIT 1000
```

**Payee Filter:**
```sql
SELECT date, payee, narration, position, balance WHERE payee ~ 'Amazon' ORDER BY date DESC, lineno DESC LIMIT 1000
```

**Tag Filter:**
```sql
SELECT date, payee, narration, position, balance WHERE 'vacation' IN tags ORDER BY date DESC, lineno DESC LIMIT 1000
```

**Combined Filters:**
Multiple conditions are joined with the `AND` operator:
```sql
SELECT date, payee, narration, position, balance WHERE account ~ '^Expenses:Food' AND date >= 2026-01-01 AND date <= 2026-01-31 ORDER BY date DESC, lineno DESC LIMIT 1000
```

:::tip
The `~` operator in BQL performs regular expression matching, making it easy to filter whole account subtrees or check partial payee names.
:::
