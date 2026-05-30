// src/lang/beancount-language.ts
import { StreamLanguage, LanguageSupport, syntaxHighlighting, StringStream } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { beancountHighlightStyle } from './beancount-highlight';

// ---------------------------------------------------------------------------
// Token type constants — returned by token() and mapped via tokenTable
// ---------------------------------------------------------------------------
const TOKEN = {
	COMMENT:   'comment',
	DATE:      'date',
	DIRECTIVE: 'directive',
	ACCOUNT:   'account',
	CURRENCY:  'currency',
	NUMBER:    'number',
	STRING:    'string',
	FLAG:      'flag',
	META:      'meta',
	TAG:       'tag',
} as const;

// ---------------------------------------------------------------------------
// Directive keywords
// ---------------------------------------------------------------------------
const DIRECTIVES = new Set([
	'open', 'close', 'balance', 'pad', 'price', 'note', 'document',
	'query', 'custom', 'pushtag', 'poptag', 'txn', 'option', 'plugin',
	'include', 'event',
]);

// Leading words of valid account-type root segments
const ACCOUNT_ROOTS = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'];
const ACCOUNT_ROOT_RE = new RegExp(
	`^(?:${ACCOUNT_ROOTS.join('|')})(?::[A-Za-z0-9][A-Za-z0-9_-]*)*`
);

// Regex helpers
const DATE_RE       = /^\d{4}-\d{2}-\d{2}(?!\d)/;
const NUMBER_RE     = /^-?\d[\d,]*(?:\.\d+)?/;
// Currency: 1-24 uppercase chars/digits, must start uppercase, may contain ' . _ -
const CURRENCY_RE   = /^[A-Z][A-Z0-9'._-]{0,22}(?=[^A-Z0-9'._-]|$)/;

// ---------------------------------------------------------------------------
// State is stateless per-line — Beancount is a fully line-oriented format
// ---------------------------------------------------------------------------
type BeancountState = Record<string, never>;

// ---------------------------------------------------------------------------
// StreamParser definition
// ---------------------------------------------------------------------------
const beancountStreamParser = {
	name: 'beancount',

	startState: (): BeancountState => ({}),

	token(stream: StringStream, _state: BeancountState): string | null {
		// ── Line comments ──────────────────────────────────────────────────
		if (stream.peek() === ';') {
			stream.skipToEnd();
			return TOKEN.COMMENT;
		}

		// ── Skip leading whitespace ────────────────────────────────────────
		if (stream.eatSpace()) return null;

		const ch = stream.peek() ?? '';

		// ── Date ───────────────────────────────────────────────────────────
		if (ch >= '0' && ch <= '9') {
			if (stream.match(DATE_RE)) return TOKEN.DATE;
			if (stream.match(NUMBER_RE)) return TOKEN.NUMBER;
			stream.next();
			return null;
		}

		// ── String literal ─────────────────────────────────────────────────
		if (ch === '"') {
			stream.next(); // opening "
			while (!stream.eol()) {
				const c = stream.next();
				if (c === '\\') { stream.next(); continue; } // escape
				if (c === '"') break;
			}
			return TOKEN.STRING;
		}

		// ── Account names ──────────────────────────────────────────────────
		if (ch >= 'A' && ch <= 'Z') {
			// Could be an account or a currency
			if (stream.match(ACCOUNT_ROOT_RE)) return TOKEN.ACCOUNT;
			if (stream.match(CURRENCY_RE)) return TOKEN.CURRENCY;
			stream.next();
			return null;
		}

		// ── Lowercase identifiers: directives or metadata keys ─────────────
		if (ch >= 'a' && ch <= 'z') {
			stream.match(/^[a-zA-Z_]+/);
			const word = stream.current();
			if (DIRECTIVES.has(word)) return TOKEN.DIRECTIVE;
			// Metadata key: lowercase-word immediately followed by ':'
			if (stream.peek() === ':') {
				stream.next(); // consume the colon
				return TOKEN.META;
			}
			return null;
		}

		// ── Flags (* !) ────────────────────────────────────────────────────
		if (ch === '*' || ch === '!') {
			stream.next();
			return TOKEN.FLAG;
		}

		// ── Tags (#tag) and links (^link) ──────────────────────────────────
		if (ch === '#' || ch === '^') {
			stream.next();
			stream.match(/^[A-Za-z0-9_-]+/);
			return TOKEN.TAG;
		}

		// ── Minus sign before a number ─────────────────────────────────────
		if (ch === '-') {
			if (stream.match(NUMBER_RE)) return TOKEN.NUMBER;
		}

		// ── Advance over unrecognised characters ───────────────────────────
		stream.next();
		return null;
	},

	// Map our token-type strings to @lezer/highlight Tags
	tokenTable: {
		[TOKEN.COMMENT]:   t.comment,
		[TOKEN.DATE]:      t.special(t.number),
		[TOKEN.DIRECTIVE]: t.keyword,
		[TOKEN.ACCOUNT]:   t.typeName,
		[TOKEN.CURRENCY]:  t.unit,
		[TOKEN.NUMBER]:    t.number,
		[TOKEN.STRING]:    t.string,
		[TOKEN.FLAG]:      t.operator,
		[TOKEN.META]:      t.propertyName,
		[TOKEN.TAG]:       t.labelName,
	} as Record<string, typeof t.comment>,
};

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/** The Lezer-backed Language object for Beancount. */
export const beancountLanguage = StreamLanguage.define<BeancountState>(beancountStreamParser);

/**
 * Full `LanguageSupport` extension — include this in a CodeMirror EditorState
 * to activate Beancount syntax highlighting in the editor.
 *
 * @example
 * ```ts
 * import { beancount } from '../../lang/beancount-language';
 * // In EditorState.create({ extensions: [ beancount(), ... ] })
 * ```
 */
export function beancount(): LanguageSupport {
	return new LanguageSupport(beancountLanguage, [
		syntaxHighlighting(beancountHighlightStyle),
	]);
}
