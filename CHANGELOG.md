6# Changelog

All notable changes to Beancount for Obsidian will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## In-progress
- **File editor: replaced textarea with CodeMirror 6 EditorView** — `.beancount` files now open in a full CodeMirror 6 editor with line numbers, undo/redo, find/replace, active-line highlighting, and Tab key support. All `@codemirror/*` packages are provided by Obsidian's runtime; no bundle-size increase. Closes [#176](https://github.com/mkshp-dev/obsidian-finance-plugin/issues/176).
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