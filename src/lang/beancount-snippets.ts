// src/lang/beancount-snippets.ts
// CodeMirror 6 snippet completions for Beancount directive keywords.
// Activates at the start of a line (column 0) when the user types a directive
// keyword prefix, and expands a fully-formed template with Tab-navigable
// placeholders via the @codemirror/autocomplete snippet() helper.

import {
    snippet,
    type CompletionContext,
    type CompletionResult,
    type Completion,
} from '@codemirror/autocomplete';

// ---------------------------------------------------------------------------
// Date helper — returns today as YYYY-MM-DD
// ---------------------------------------------------------------------------

function todayStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Snippet definitions
// Each `apply` function is built from snippet() so CM6 handles placeholder
// navigation with Tab automatically.
// ---------------------------------------------------------------------------

function makeSnippets(): Completion[] {
    const today = todayStr();

    return [
        {
            label: 'txn',
            detail: 'transaction snippet',
            type: 'keyword',
            info: 'Expand a full transaction block',
            apply: snippet(
                `${today} * "\${payee}" "\${narration}"\n` +
                `  \${1:Assets:Checking}       \${2:-0.00} \${3:USD}\n` +
                `  \${4:Expenses:Uncategorized}`
            ),
            boost: 10,
        },
        {
            label: 'open',
            detail: 'open account snippet',
            type: 'keyword',
            info: 'Expand an open directive',
            apply: snippet(
                `${today} open \${1:Assets:Checking} \${2:USD}`
            ),
            boost: 10,
        },
        {
            label: 'close',
            detail: 'close account snippet',
            type: 'keyword',
            info: 'Expand a close directive',
            apply: snippet(
                `${today} close \${1:Assets:Checking}`
            ),
            boost: 10,
        },
        {
            label: 'bal',
            detail: 'balance assertion snippet',
            type: 'keyword',
            info: 'Expand a balance directive',
            apply: snippet(
                `${today} balance \${1:Assets:Checking}   \${2:0.00} \${3:USD}`
            ),
            boost: 10,
        },
        {
            label: 'pad',
            detail: 'pad directive snippet',
            type: 'keyword',
            info: 'Expand a pad directive',
            apply: snippet(
                `${today} pad \${1:Assets:Checking} \${2:Equity:Opening-Balances}`
            ),
            boost: 10,
        },
        {
            label: 'price',
            detail: 'price directive snippet',
            type: 'keyword',
            info: 'Expand a price directive',
            apply: snippet(
                `${today} price \${1:USD} \${2:1.00} \${3:EUR}`
            ),
            boost: 10,
        },
        {
            label: 'note',
            detail: 'note directive snippet',
            type: 'keyword',
            info: 'Expand a note directive',
            apply: snippet(
                `${today} note \${1:Assets:Checking} "\${2:memo}"`
            ),
            boost: 10,
        },
    ];
}

// ---------------------------------------------------------------------------
// CompletionSource — only fires at column 0 (start of line)
// ---------------------------------------------------------------------------

/**
 * Raw CompletionSource for directive snippet templates.
 * Activates only when the cursor is at the very beginning of a line
 * (no leading whitespace before the typed keyword).
 * Exported for composition into a shared autocompletion() extension.
 */
export function beancountSnippetSource(context: CompletionContext): CompletionResult | null {
    const { state, pos } = context;
    const line = state.doc.lineAt(pos);

    // Only activate when cursor is at the very start of the line content
    const lineUpToCursor = line.text.slice(0, pos - line.from);
    const matchAtStart = lineUpToCursor.match(/^([a-z]*)$/);
    if (!matchAtStart) return null;

    const typed = matchAtStart[1];
    const snippets = makeSnippets();
    const options = snippets.filter((s) =>
        (s.label).startsWith(typed)
    );

    if (options.length === 0) return null;

    return {
        from: line.from,
        options,
        filter: false,
    };
}
