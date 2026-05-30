// src/lang/beancount-highlight.ts
import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Highlight style for Beancount that maps to Obsidian CSS variables
 * so it automatically respects light and dark themes.
 */
export const beancountHighlightStyle = HighlightStyle.define([
	// Line comments: muted, italicised
	{ tag: t.comment, color: 'var(--text-muted)', fontStyle: 'italic' },

	// Directives (open, close, balance, txn, etc.): keyword purple
	{ tag: t.keyword, color: 'var(--color-purple)', fontWeight: 'bold' },

	// Dates (YYYY-MM-DD): cyan — temporal anchors stand out clearly
	{ tag: t.special(t.number), color: 'var(--color-cyan)' },

	// Account names (Assets:…, Liabilities:…, etc.): orange typeface
	{ tag: t.typeName, color: 'var(--color-orange)' },

	// Currencies / commodities (USD, EUR, BTC, AAPL): green
	{ tag: t.unit, color: 'var(--color-green)' },

	// Numeric amounts
	{ tag: t.number, color: 'var(--color-blue)' },

	// String literals — payee and narration
	{ tag: t.string, color: 'var(--color-yellow)' },

	// Transaction flags (* !)
	{ tag: t.operator, color: 'var(--color-red)' },

	// Metadata keys (key:)
	{ tag: t.propertyName, color: 'var(--color-cyan)', fontStyle: 'italic' },

	// Tags (#tag) and links (^link)
	{ tag: t.labelName, color: 'var(--color-pink)' },
]);
