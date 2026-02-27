---
sidebar_position: 5
---

# 💹 Automated Price Fetching

The plugin integrates with **`bean-price`** to automatically fetch current market prices for your commodities (stocks, ETFs, mutual funds, cryptocurrencies, and more) and save them to your `prices.beancount` file.

---

## How It Works

1. The plugin runs `bean-price <ledger.beancount>` — passing your **main ledger file** so that bean-price can discover all commodities with configured price sources.
2. `bean-price` fetches current prices from the internet (Yahoo Finance, Morningstar, Coinbase, etc.) and prints ready-to-use Beancount price directives to stdout.
3. The plugin filters those lines, **deduplicates** them against existing content in `prices.beancount`, and **appends only new directives**.
4. Your prices file stays in sync — no manual entry required.

**Example price directive written to `prices.beancount`:**
```beancount
2026-02-27 price AAPL 179.50 USD
2026-02-27 price VTSAX 123.45 USD
```

---

## Installation

`bean-price` is part of the `beanprice` package (separate from Beancount itself):

```bash
pip install beanprice
```

Verify installation:
```bash
bean-price --version
```

:::tip WSL Users
If you run Beancount inside WSL, the plugin will automatically detect and use `wsl bean-price` during the onboarding prerequisites check.
:::

---

## Annotating Commodities with Price Sources

For `bean-price` to fetch prices, each commodity needs a `price:` metadata line specifying the data source.

**Common examples:**

```beancount
; US stocks — Yahoo Finance
2024-01-01 commodity AAPL
  price: "USD:yahoo/AAPL"

; ETFs
2024-01-01 commodity VTSAX
  price: "USD:yahoo/VTSAX"

; Cryptocurrencies (Coinbase Pro)
2024-01-01 commodity BTC
  price: "USD:coinbase/BTC-USD"

; Indian stocks (via Yahoo Finance)
2024-01-01 commodity RELIANCE
  price: "INR:yahoo/RELIANCE.NS"
```

:::note
For a full list of supported price sources and their syntax, see the [beanprice documentation](https://github.com/beancount/beanprice).
:::

---

## Enabling Automatic Price Fetching

1. Open **Settings → Beancount for Obsidian → General**
2. Toggle **"Enable automatic price fetching"** → On
3. Set your preferred **fetch interval** (default: 24 hours)

The interval starts immediately — no Obsidian restart needed.

You can also view when the last automatic fetch ran below the interval field.

---

## Manual Price Fetch

Run a price fetch on-demand at any time:

**Command Palette** (`Ctrl/Cmd + P`) → **"Fetch Commodity Prices"**

A notification will confirm how many new price directives were saved.

---

## Where Prices Are Saved

All fetched prices are written to:

```
Finances/
└── prices.beancount   ← prices appended here
```

The file is never overwritten — only new directives are appended. Existing price entries are preserved.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Enable automatic price fetching | Off | Toggle scheduled price fetching |
| Fetch interval (hours) | 24 | How often the automatic fetch runs |
| bean-price command | Auto-detected | Set manually in Connection settings if needed |

---

## Troubleshooting

### "bean-price command not configured or not found"

- **During onboarding**: Run the prerequisites check — it will auto-detect bean-price.
- **Manual setup**: In **Settings → Connection**, look for the bean-price command field, or run:
  ```bash
  pip install beanprice
  bean-price --version
  ```

### No prices fetched after running the command

- Verify your commodities have `price:` metadata (see [Annotating Commodities](#annotating-commodities-with-price-sources))
- Check your internet connection — bean-price makes network requests
- Open the dev console (`Ctrl+Shift+I`) and look for `[PriceService]` log messages
- bean-price stderr warnings (e.g. balance errors) are logged but do **not** cause failure

### Prices not updating / stale prices

- `bean-price` fetches the **current market price** — outside market hours you may get the last close
- Ensure your commodity's price source ticker is correct (e.g. `RELIANCE.NS` for NSE stocks on Yahoo)

### Duplicate prices appearing

Deduplication is line-based. If the same directive (same date, symbol, amount, currency) already exists in `prices.beancount`, it will not be appended.
