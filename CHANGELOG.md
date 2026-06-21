# Changelog

All notable changes to Beancount Ledger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## In-progress

- **Multi-Currency Warning: Clarify warning column wording** — Updated the multi-currency warnings on the Balance Sheet and Income Statement to reference the specific reporting currency name instead of positional column descriptions like 'first column' and 'second column' to prevent user confusion. Merged PR #230.

- **Income Statement: Fix Net Profit trend signs and show income as positive** — Updated the income statement and net profit trend charts to display conventional signs (positive values for profit and negative values for loss), negating credit accounts at the source so income balances render as positive. Adjusted chart colors (green for profit, red for loss) and fixed the anomalous stripes rendering on the Income Sunburst Chart. Merged PR #238.

- **Financial Overview: Selectable reporting periods** — Added a period selector to the Overview dashboard to filter income, expenses, and savings rate KPI cards. Supports presets (This Month, Last Month, This Year, Last Year) as well as custom months and years. Updates the total balance query to compute historical period-end net worth correctly based on the selected period end date. Merged PR #234.

- **Budget & Target Suggestions: Improve account autocomplete** — Removed the arbitrary 8-item hard limit from the Add Budget and Add Target account autocomplete lists. Added matching result counts, default/empty state notes, and increased dropdown heights with full scrollbar support. Merged PR #239.

- **Commodity Dashboard: Display names and price history** — Added support for retrieving and displaying human-readable display names from Beancount commodity metadata. Introduced interactive price history chart and table views in the commodity details modal. Restructured card grids and key-value details layout with overflow-wrap/ellipsis rules to handle long text fields without UI clipping or overlap. Merged PR #237.

- **Journal Filter Autocomplete: Custom suggestion menus** — Replaced native HTML `<datalist>` inputs with custom, scrollable dropdown menus for Account, Payee, and Tag filters in the Journal view. Truncates rendering to the top 50 matches to prevent Electron/Obsidian DOM lag, while preserving full search capabilities. Adds keydown handlers (Escape to close) and click-safe blur timers. Merged PR #236.

- **Performance: Optimize Balance Sheet and Income Statement queries using BQL native position filtering** — Shipped native position splitting via `only()` and regex substitutions via `subst()` inside `bean-query`, moving heavy parsing out of the Svelte frontend. This reduces processing steps, simplifies the controllers, and speeds up dashboard load times. Closes [#211](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/211).

- **Commodity Dashboard: Support negative commodity holdings and correct UI rendering** — Updated parser to preserve negative signs from BQL units/values queries (allowing short/residual positions). Fixed `CommodityCard` value rendering to correctly display negative operating currency values instead of falling back to raw units, and updated `CommoditiesTab` filters (`has_holding` / `has_both`) to check for non-zero holdings (`!== 0`) so short positions are not hidden. Merged PR #229.

## 2.1.8 - 2026-06-15

## 2.1.7 - 2026-06-15

## 2.1.6 - 2026-06-14

## 2.1.5 - 2026-06-14

## 2.1.4 - 2026-06-14

## 2.1.3 - 2026-06-14

- **Component Cards: Refine styling, margins, and density** — Refactored TransactionCard, BalanceCard, NoteCard, and CommodityCard to use a var(--background-secondary) background with subtle border-hover outlines. Tightened component padding, optimized typography visual hierarchy (emphasizing values, muting labels/dates), and reduced line-heights to present dense card lists cleanly. Closes [#219](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/219).

- **Dashboard Layout: Optimize tab padding, density, and controls** — Moved outer padding to UnifiedDashboardView's tab container, removing double padding across all tabs. Increased density on Income Statement and Balance Sheet tables by reducing cell padding and using smaller UI font sizes. Tightened TransactionsTab filter controls with compact spacing and standard Obsidian-aligned input heights. Closes [#218](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/218).

- **Modal Polish: Compact grid layouts, unified spacing, and standard footers** — Refactored form layouts in AddBudgetModal, AddTargetModal, and CommodityCreateModal to use CSS Grid for compact, aligned form presentation. Standardized spacing using Obsidian design tokens, unified modal footers using a standard .modal-footer class aligned to the bottom right, and adjusted custom autocomplete dropdown max heights to optimize vertical space. Closes [#217](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/217).

- **Onboarding Workflow: Refactor wizard to Svelte & polish layout** — Replaced the custom DOM-based onboarding wizard with a Svelte component, introduced a card-based data selection layout, reduced vertical spacing, adopted Obsidian's native setting-item classes, and standardized success/warning states to match Obsidian UI tokens. Closes [#216](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/216).

- **Design Cleanups: Adopt Obsidian spacing and CSS tokens** — Transitioned inline styles across Svelte/TypeScript files to external stylesheets and `<style>` blocks, cleaned up hardcoded pixels to use design tokens, standardized typography variables, and compacted inputs/buttons for a professional native Obsidian feel. Closes [#215](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/215).

- **Loading & Error States: Standardize status states across all tabs** — Added unified, premium skeleton loaders, error banners with interactive retry buttons, and empty state illustrations. Integrated them across all 5 dashboard views to prevent sudden blank state shifts. Closes [#87](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/87).

- **Design Tokens: Establish design token system in styles.css** — Added consistent spacing, typography, shadow, transition, and finance-specific color variables (assets, liabilities, equity, income, expense) adapting automatically to light/dark themes under `:root`. Refactored existing styles to use these variables for better theme integration. Closes [#84](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/84).

- **File Organization: Support monthly transaction files** — Added setting to organize transactions by month (`transactions/YYYY/YYYY-MM.beancount`) instead of just yearly. Updates the onboarding wizard and automatic file management tools to support both formats dynamically, and resolves a bug where the main ledger includes remained yearly after initial creation or migration. Closes [#210](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/210).

- **Financial Indicators: Add edit and delete support for budgets and targets** — Added UI action buttons to edit and delete indicators, backed by new atomic update/delete directives helpers and event line location querying. Closes [#207](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/207).

## [2.0.0] - 2026-06-03

### Changed ⚠️
- **Security & Compatibility: Vault-only ledger requirement (Breaking Change)** — Replaced all direct filesystem access (`fs` and `fs/promises` imports) in `fileEditor.ts`, `directives.ts`, and `PriceService` with Obsidian's native Vault adapter APIs (`exists`, `read`, `write`, `remove`, `rename`, `copy`). Because the Obsidian Vault API is strictly scoped to files inside the vault, the plugin now requires your Beancount ledger and any included files to be stored inside the current vault. Absolute paths outside the vault are no longer supported. Closes [#203](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/203).

### Security 🔒
- **CLI Execution: Migrate to safe parameterized spawn calls** — Replaced all shell execution (`exec` and `execAsync`) calls across `SystemDetector`, `queryRunner`, `price.service`, and `sidebar-view` with a secure utility `execSafe` that runs commands directly as process spawns without shell invocation (`shell: false`). Replaced shell-based OS detection with native Node APIs, added whitelist sanitization to user-configured price metadata, and documented permissions in the README. Closes [#204](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/204).

## [1.6.0] - 2026-05-31

### Added 🚀
- **Editor: Inline linting via bean-query `.errors` diagnostics** — Beancount validation errors now appear as red squiggly underlines directly in the editor. Uses the existing `runQuery` / bean-query infrastructure (no separate `bean-check` install required): runs the special `.errors` BQL command, parses the plain text output, and maps results to CodeMirror 6 `Diagnostic` objects. A lint-gutter marker appears in the left margin for each affected line; hovering shows the full error message. Three modes in Settings → BQL → Editor Settings: *Off*, *On save* (default, ~500 ms after save), and *On change* (2 s debounce). Lint runs silently without blocking editing. Implemented in `src/lang/beancount-lint.ts` (`getErrors` + `beancountLinter`). Closes [#190](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/190).
- **Editor: Directive snippet templates (txn, open, balance, price, pad…)** — typing a directive keyword (`txn`, `open`, `close`, `bal`, `pad`, `price`, `note`) at the very start of a line and pressing Tab now expands a fully-formed directive template with Tab-navigable placeholders. Today's date is pre-filled in every snippet. Implemented in `src/lang/beancount-snippets.ts` as a `beancountSnippetSource` composed into a single `autocompletion()` extension together with the existing account/payee/narration sources in `BeancountFileView`. Closes [#186](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/186).
- **Editor: Smart indentation and Format Document command** — pressing Enter after a posting or directive line now auto-indents the new line with 2 spaces; a new "Format Document" command (`Ctrl/Cmd+Shift+F` or via the command palette as *Format Beancount Document*) normalises posting indentation to 2 spaces, right-aligns amounts within each transaction block, and fixes `@` / `@@` price-annotation spacing. An opt-in "Format on save" toggle (Settings → BQL → Editor Settings, default off) applies the formatter automatically on every save. Implemented in `src/lang/beancount-indent.ts` (`indentService`) and `src/lang/beancount-format.ts` (pure `formatBeancount` + CodeMirror command). Closes [#184](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/184).
- **Editor: Payee, narration, currency, tag and link autocomplete** — extended the existing CodeMirror 6 completion system with four new context-aware sources: (1) payee suggestions inside the first quoted string of a transaction header, sourced from `getPayees()`; (2) narration suggestions inside the second quoted string, optionally filtered by the already-typed payee; (3) currency/commodity completions after numeric amounts or after `commodity`/`price`/`balance` directives, sourced from `getCommodities()`; (4) tag completions after `#` and link completions after `^` in transaction headers, sourced from `getTags()` and the ledger's `links` column respectively. All sources share the same 30-second TTL cache per plugin instance. Completions are context-isolated and do not leak between fields. The Settings → BQL → Editor Settings toggle now governs all completion types and its label was updated to "Editor autocomplete". Closes [#182](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/182).
- **Editor: Account-name autocomplete in the Beancount file editor** — typing an account prefix (`Assets:`, `Expenses:Food`, etc.) in a `.beancount` file now shows a completion popup with matching open accounts. Completions are sourced from the ledger's `open` directives via `getOpenAccounts()`, sorted by usage frequency, and cached for 30 seconds (cache is invalidated on file reload). The popup is suppressed inside comment lines and string literals. A new toggle **Account name autocomplete** in Settings → BQL → Editor Settings lets users enable or disable the feature. Closes [#180](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/180).
- **File editor: Beancount syntax highlighting via Lezer grammar** — `.beancount` files now render with full colour-coded syntax highlighting: directives, dates, account names, currencies, amounts, string literals, metadata keys, tags, flags, and comments are each tokenised and mapped to Obsidian CSS variables so the colours adapt automatically to light and dark themes. Implemented as a `StreamLanguage`-backed `LanguageSupport` extension (`src/lang/beancount-language.ts` + `src/lang/beancount-highlight.ts`) consumed by `BeancountFileView`. Closes [#178](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/178).
- **File editor: replaced textarea with CodeMirror 6 EditorView** — `.beancount` files now open in a full CodeMirror 6 editor with line numbers, undo/redo, find/replace, active-line highlighting, and Tab key support. All `@codemirror/*` packages are provided by Obsidian's runtime; no bundle-size increase. Closes [#176](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/176).

### Improved 🚀
- **Documentation: Refactor Docusaurus documentation hierarchy** — restructured the documentation layout to match a more logical user flow, splitting requirements, introducing new guides for direct file editing features (autocomplete, linting, formatting, snippets), documenting the new accounts & balances and income statement dashboard tabs, and grouping advanced BQL queries. Closes [#199](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/199).

### Fixed 🐛
- **Accounts and Balances: duplicate "Net Worth Trend" label in trend chart area** — removed the extra chart title rendering so the label appears once in the selector UI.
- **Commodity metadata: price source test failed for valid expressions on Windows** — switched validation to execute `bean-price -e <source>` using argument-based process spawning (instead of shell-quoted command strings), fixing errors such as invalid source with extra quote characters.
- **File writes: race conditions and newline corruption on Windows** — adopted Fava-like file-write safety measures across all CRUD operations:
  - **Concurrency control:** introduced an async mutex (`FileLock`) in `fileEditor.ts`; concurrent writes to the same path are now queued sequentially, and unique temporary filenames eliminate race conditions between parallel `.tmp` writes.
  - **Newline preservation:** all read-modify-write operations (`updateBalance`, `deleteBalance`, `updateNote`, `deleteNote`, `updateTransaction`, `deleteTransaction`, `saveCommodityMetadata`, `deleteCommodityDirective`) now detect and preserve the file's original line ending (`\r\n` or `\n`) via `getNewlineCharacter()`.
  - **Append/create operations extended:** `saveOpenDirective`, `saveCloseDirective`, `createBalanceAssertion`, `createNote`, `createCommodity`, and `createPriceDirective` now also detect the target file's line ending before appending, ensuring newly written directives match the file's existing style. (PR #173 + follow-up)

## [1.5.2] - 2026-05-27

### Fixed 🐛
- **Indicators: wrong-cycle data for rollover budgets** — rollover queries previously used `GROUP BY (year, month) ... ORDER BY DESC LIMIT 1`, returning the most recent past cycle's row when the current cycle had no postings yet. Replaced with an aggregate-only query filtered to the current cycle via `date_trunc`.
- **Indicators: rollover remaining stuck at base amount** — when an account had no postings at all, the query returned zero rows and the fallback reset remaining to `targetAmount`, discarding accumulated carry-over. Remaining is now computed client-side as `elapsedCycles × targetAmount − cumulativeBalance`.
- **Indicators: negative available budget shown as "On Track"** — a rollover deficit made `effectiveTarget` negative, but `getPct` short-circuited to `0%` (green). Negative or zero effective target now correctly renders as "Over Budget".
- **Indicators: rollover targets silently treated as non-rollover** — `loadTargetStatus` always computed `remaining = targetAmount − current` regardless of `isRollOver`. Now applies the correct carry-over formula for rollover targets.

### Improved 🚀
- **Demo ledger** — uncommented the example BQL query and added multiple `event "Indicator"` directives (Budgets and Targets) so the Financial Indicators section is populated when users first test the plugin. Closes [#164](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/164).

---