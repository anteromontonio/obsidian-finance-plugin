---
sidebar_position: 7
---

# Commodities Tab

The **Commodities Tab** manages all currencies and assets used in your Beancount ledger—from stocks and crypto to forex and commodities.

---

## 🪙 Features

### Commodity Overview
View all commodities declared in your ledger with:
*   **Symbol**: Ticker or commodity code (e.g., `AAPL`, `BTC`, `EUR`).
*   **Latest Price**: Most recent price point with date.
*   **Status Indicator**: Quick visual indicator of price data availability:
    *   🟢 **Automated**: Price fetcher configured and working.
    *   ⚪ **Manual**: No automated source configured.
    *   ❌ **Error**: Price fetcher failed.

### Metadata Management
For each commodity, you can configure:
*   **Commodity Details**: Access via click to open detailed view modal.
*   **Price Source**: The fetch source string (e.g., `yahoo/AAPL` for Yahoo Finance).
*   **Logo/Icon URL**: Custom image URL for the commodity.
*   **Display Name**: Human-readable name.
*   **Quote Currency**: The currency this commodity is priced in.

### Price Validation
*   **Test Price Source**: Verify your price fetcher configuration works correctly.
*   **Validate Format**: Ensures the price source string is valid.
*   **Live Testing**: Runs `bean-price` to check if the source can actually fetch prices.

---

## 🔍 Behind the Scenes: BQL Queries

The Commodities tab uses specialized queries to access Beancount's commodity and price data:

### List All Commodities
```sql
SELECT name AS name_ FROM #commodities GROUP BY name
```

### Commodity Price Data
```sql
SELECT last(date) AS date_, last(currency) AS currency_, round(getprice(last(currency), 'USD'),2) AS price_, currency_meta(last(currency), 'logo') AS logo_, bool(today()-1<last(date)) AS islatest_ FROM #prices GROUP BY currency
```

### Commodity Details (for modal)
```sql
SELECT name AS name_, last(meta) AS meta_, currency_meta(last(name),'logo') AS logo_, currency_meta(last(name), 'price') AS pricemetadata_, meta('filename') AS filename_, meta('lineno') AS lineno_ FROM #commodities WHERE name='AAPL'
```
