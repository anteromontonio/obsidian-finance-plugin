---
sidebar_position: 5
---

# Accounts and Balances

The **Accounts & Balances** view is the tree-grid representation of your active ledger accounts. It acts as the command center for inspecting individual balances and managing your account list.

---

## 🌳 Account Tree Hierarchy

Your accounts are structured hierarchically (e.g. `Assets:Checking:Main` is a child of `Assets:Checking`).

### Parent-Child Aggregation
*   **Leaf Accounts**: Accounts that receive postings directly.
*   **Parent Accounts (Categories)**: Accounts that group other accounts. Parent account balances automatically display the **aggregated sum** of their own balance plus all their children's balances.
*   This makes it easy to see your total checking assets by looking at `Assets:Checking` even if you have several sub-accounts.

### Collapsible Nodes
*   You can click on any parent account row to collapse or expand its subtree.
*   The plugin remembers your expansion/collapse state so that you don't have to re-configure it every time you switch tabs or reload Obsidian.

---

## ➕ Managing Accounts from the UI

You can create or retire accounts directly from this tab without writing plain text directives:

### 1. Opening a New Account
1.  Click the **➕ Open Account** button in the header.
2.  Fill in the fields:
    *   **Account Name**: Select a parent prefix and append your new sub-account name (e.g. `Assets:Savings:VacationFund`).
    *   **Date**: Select when this account becomes active (typically the current date or start of the year).
    *   **Allowed Currencies**: List comma-separated currencies (e.g., `USD, EUR`) if you wish to restrict the currencies this account can hold (optional).
3.  Click **Create**. The plugin appends the `open` directive to `accounts.beancount`.

### 2. Closing an Account
1.  Click the **❌ Close Account** button in the header.
2.  Select the active account you wish to retire from the dropdown.
3.  Choose the closing date.
4.  Click **Close**. The plugin appends the `close` directive to `accounts.beancount`.
    > [!WARNING]
    > An account can only be closed if its balance is exactly zero on the closing date. If it holds assets, transfer them to another account first.


