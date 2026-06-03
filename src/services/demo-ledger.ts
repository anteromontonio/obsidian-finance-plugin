// src/services/demo-ledger.ts

export const DEMO_LEDGER_CONTENT = `;; Beancount Demo Ledger
;; Created by Beancount for Obsidian
;; Comprehensive example demonstrating all major Beancount features

;; ============================================================================
;; Global Options
;; ============================================================================

option "title" "Personal Finance Demo"
option "operating_currency" "USD"

;; ============================================================================
;; Commodities
;; ============================================================================

1970-01-01 commodity USD
  name: "US Dollar"
  asset-class: "cash"
1970-01-01 commodity EUR
  name: "Euro"
  asset-class: "cash"
2020-01-01 commodity AAPL
  name: "Apple Inc."
  price: "yahoo/AAPL"
  logo: "https://logos.hunter.io/apple.com"
  asset-class: "stock"
2020-01-01 commodity GOOGL
  name: "Alphabet Inc."
  price: "yahoo/GOOGL"
  logo: "https://logos.hunter.io/google.com"
  asset-class: "stock"
2020-01-01 commodity MSFT
  name: "Microsoft Corporation"
  price: "yahoo/MSFT"
  logo: "https://logos.hunter.io/microsoft.com"
  asset-class: "stock"

;; ============================================================================
;; Accounts
;; ============================================================================

2020-01-01 open Assets:Checking                                 USD
  description: "Primary checking account"
2020-01-01 open Assets:Savings                                  USD
  description: "High-yield savings account"
2020-01-01 open Assets:Investments                              USD, MSFT, GOOGL, AAPL
  description: "Investment brokerage account"
2020-01-01 open Liabilities:CreditCard                          USD
  description: "Credit card account"
2020-01-01 open Income:Salary                                   USD
  description: "Employment income"
2020-01-01 open Income:Interest                                 USD
  description: "Interest income from savings"
2020-01-01 open Income:Dividends                                USD
  description: "Dividend income from investments"
2020-01-01 open Income:CapitalGains                             USD
  description: "Capital gains from investment sales"
2020-01-01 open Expenses:Food:Groceries                         USD
2020-01-01 open Expenses:Food:Dining                            USD
2020-01-01 open Expenses:Rent                                   USD
2020-01-01 open Expenses:Utilities                              USD
2020-01-01 open Expenses:Transport                              USD
2020-01-01 open Expenses:Shopping                               USD
2020-01-01 open Expenses:Commissions                            USD
2020-01-01 open Equity:Opening-Balances                         USD

;; ============================================================================
;; Price History
;; ============================================================================

2026-01-03 price AAPL                               185.50 USD
2026-01-03 price GOOGL                              142.30 USD
2026-01-03 price MSFT                               415.20 USD
2026-01-03 price EUR                                  1.10 USD
2026-02-01 price AAPL                               192.75 USD
2026-02-01 price GOOGL                              145.60 USD
2026-02-01 price MSFT                               425.80 USD
2026-02-01 price EUR                                  1.11 USD

;; ============================================================================
;; Pad Directives
;; ============================================================================
;; (none in this demo)

;; ============================================================================
;; Balance Assertions
;; ============================================================================

2026-01-02 balance Assets:Checking                                 5000.00 USD
2026-01-02 balance Assets:Savings                                  10000.00 USD
2026-01-02 balance Liabilities:CreditCard                          -500.00 USD
2026-02-01 balance Assets:Checking                                 2853.05 USD

;; ============================================================================
;; Named Queries
;; ============================================================================

2026-01-01 query "monthly-expenses" "
  SELECT date, narration, COST(position) AS amount
  FROM account ~ 'Expenses:'
  WHERE year = YEAR(TODAY()) AND month = MONTH(TODAY())
"

;; ============================================================================
;; Notes
;; ============================================================================

2026-01-01 note Assets:Checking "Primary checking account - switched from old bank"
2026-01-15 note Liabilities:CreditCard "APR is 18.99% - consider paying off"

;; ============================================================================
;; Events
;; ============================================================================

2026-01-01 event "location" "New York"
2026-01-01 event "Indicator" "Budget"
  accountQuery: "Expenses:Food"
  name: "Monthly Food Budget"
  cycle: "Monthly"
  isRollover: 0
  target: 500.00
  currency: "USD"
2026-01-01 event "Indicator" "Budget"
  accountQuery: "Expenses:Rent"
  name: "Monthly Rent"
  cycle: "Monthly"
  isRollover: 0
  target: 1200.00
  currency: "USD"
2026-01-01 event "Indicator" "Target"
  accountQuery: "Assets:Savings"
  name: "Emergency Fund"
  cycle: "Yearly"
  isRollover: 1
  target: 15000.00
  currency: "USD"
2026-03-15 event "tax-filing" "Filed 2025 Tax Return"
2026-06-01 event "employer" "Promoted to Senior Position"

;; ============================================================================
;; Transactions
;; ============================================================================

2026-01-01 * "Opening Balance"
  Assets:Checking            5000.00 USD
  Assets:Savings            10000.00 USD
  Liabilities:CreditCard     -500.00 USD
  Equity:Opening-Balances  -14500.00 USD

2026-01-03 * "Broker" "Purchase Apple Stock"
  Assets:Investments          10 AAPL {185.50 USD, 2026-01-03}
  Expenses:Commissions      4.95 USD
  Assets:Checking       -1859.95 USD

2026-01-05 * "Landlord" "Monthly Rent" #rent
  Expenses:Rent     1200.00 USD
  Assets:Checking  -1200.00 USD

2026-01-10 * "Grocery Store" "Weekly Groceries" #food #groceries
  Expenses:Food:Groceries   150.00 USD
  Liabilities:CreditCard   -150.00 USD

2026-01-12 * "Broker" "Purchase Google Stock"
  Assets:Investments          5 GOOGL {142.30 USD, 2026-01-12}
  Expenses:Commissions     4.95 USD
  Assets:Checking       -716.45 USD

2026-01-15 * "Employer" "Bi-weekly Salary" ^paycheck-001
  Assets:Checking   3000.00 USD
  Income:Salary    -3000.00 USD

2026-01-18 * "Broker" "Purchase Microsoft Stock"
  Assets:Investments           3 MSFT {415.20 USD, 2026-01-18}
  Expenses:Commissions      4.95 USD
  Assets:Checking       -1250.55 USD

2026-01-20 * "Restaurant" "Dinner with friends" #dining #food
  Expenses:Food:Dining     85.50 USD
  Liabilities:CreditCard  -85.50 USD

2026-01-22 ! "Online Purchase" "Pending charge" #shopping
  Expenses:Shopping        125.00 USD
  Liabilities:CreditCard  -125.00 USD

2026-01-25 * "Utility Co" "Electric Bill" #utilities
  Expenses:Utilities   120.00 USD
  Assets:Checking     -120.00 USD

2026-01-28 * "Gas Station" "Fuel" #transport
  Expenses:Transport       45.00 USD
  Liabilities:CreditCard  -45.00 USD

2026-02-01 * "Credit Card Co" "Payment" ^cc-payment-001
  Liabilities:CreditCard   500.00 USD
  Assets:Checking         -500.00 USD

2026-02-05 * "Landlord" "Monthly Rent" #rent
  Expenses:Rent     1200.00 USD
  Assets:Checking  -1200.00 USD

2026-02-10 * "Bank" "Interest Payment"
  Assets:Savings    15.00 USD
    interest: "0.25% APY"
  Income:Interest  -15.00 USD

2026-02-10 * "Grocery Store" "Weekly Groceries" #food #groceries
  Expenses:Food:Groceries   145.00 USD
  Liabilities:CreditCard   -145.00 USD

2026-02-15 * "Employer" "Bi-weekly Salary" ^paycheck-002
  Assets:Checking   3000.00 USD
  Income:Salary    -3000.00 USD

2026-02-15 * "Apple Inc" "Quarterly Dividend"
  Assets:Investments   2.50 USD
  Income:Dividends    -2.50 USD

;; Note: The transaction below is intentionally unbalanced to demonstrate
;; how Beancount error reporting works in the plugin.
2026-02-20 * "Broker" "Sell Apple Stock - Partial Position"
  Assets:Investments        -3 AAPL {185.50 USD, 2026-01-03} @ 192.75 USD
  Expenses:Commissions    24.95 USD
  Assets:Checking       551.30 USD
  Income:CapitalGains   -21.75 USD
`;
