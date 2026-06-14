// src/lang/beancount-format.ts
// Pure formatting function and CodeMirror command for Beancount files.
//
// formatBeancount(text):
//   • Normalises posting indentation to exactly 2 spaces
//   • Right-aligns amounts within each transaction block (column alignment)
//   • Normalises spacing around @ and @@ price annotations
//   • Preserves blank lines between transactions / directives

import type { EditorView } from '@codemirror/view';

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

/** A line that starts a new top-level directive (column 0, not whitespace/blank). */
const DIRECTIVE_START_RE = /^(?:\d{4}-\d{2}-\d{2}|option\b|plugin\b|include\b|pushtag\b|poptag\b|query\b|custom\b|event\b)/;

/** A transaction block header: date + any flag (* ! P txn T D F R M U N C W I etc.) */
const TXN_HEADER_RE = /^\d{4}-\d{2}-\d{2}\s+(?:[*!PTDFRMUNCWI]|txn)\b/;

/** Match amount + currency at the tail of a posting: "  -1,234.56 USD  @ ..." */
const AMOUNT_RE = /^(-?[\d,]+(?:\.\d+)?)\s+([A-Z][A-Z0-9'._-]*)(.*)$/;

// ---------------------------------------------------------------------------
// Block splitting — split on top-level directive lines (column 0)
//   Blank lines between directives are preserved as their own entries.
// ---------------------------------------------------------------------------

interface Block {
    lines: string[];
    isBlank: boolean; // true = this block is just whitespace/blank lines
}

function splitIntoBlocks(lines: string[]): Block[] {
    const blocks: Block[] = [];
    let current: string[] = [];

    const flush = () => {
        if (current.length > 0) {
            const allBlank = current.every((l) => l.trim() === '');
            blocks.push({ lines: current, isBlank: allBlank });
            current = [];
        }
    };

    for (const line of lines) {
        const isDirectiveStart = DIRECTIVE_START_RE.test(line) && line.trim() !== '';

        if (isDirectiveStart) {
            // Flush whatever we had (blank separators etc.)
            flush();
            current.push(line);
        } else if (line.trim() === '') {
            // Blank line — flush current directive block, then collect blanks
            if (current.length > 0 && !current.every((l) => l.trim() === '')) {
                // We have a real block; end it before the blank
                flush();
            }
            current.push(line);
        } else {
            // Indented line (posting / metadata) — belongs to the current block
            current.push(line);
        }
    }
    flush();
    return blocks;
}

// ---------------------------------------------------------------------------
// Per-block formatting
// ---------------------------------------------------------------------------

/**
 * Format a single transaction block:
 *   1. Keep the header line as-is
 *   2. Normalise posting indent to exactly 2 spaces
 *   3. Right-align amounts to the widest amount column within the block
 *   4. Normalise @ / @@ spacing
 */
function formatTransactionBlock(lines: string[]): string[] {
    const [header, ...rest] = lines;

    interface ParsedPosting {
        account: string;
        amountStr: string | null;
        currency: string | null;
        tail: string;
        isComment: boolean;
        isBlank: boolean;
        isMetadata: boolean;
        rawOther: string | null; // for lines we can't parse
    }

    const postings: ParsedPosting[] = rest.map((line): ParsedPosting => {
        if (line.trim() === '') {
            return { account: '', amountStr: null, currency: null, tail: '', isComment: false, isBlank: true, isMetadata: false, rawOther: null };
        }
        const trimmed = line.trimStart();
        if (trimmed.startsWith(';')) {
            return { account: trimmed, amountStr: null, currency: null, tail: '', isComment: true, isBlank: false, isMetadata: false, rawOther: null };
        }

        // Metadata line: "key: value"
        if (/^[a-z_][a-z0-9_]*\s*:/.test(trimmed)) {
            return { account: trimmed, amountStr: null, currency: null, tail: '', isComment: false, isBlank: false, isMetadata: true, rawOther: null };
        }

        // Posting: starts with an account name (Assets:, Liabilities:, …)
        const accountMatch = trimmed.match(/^([A-Z][A-Za-z0-9]*(?::[A-Za-z0-9][A-Za-z0-9_-]*)*)(.*)$/);
        if (!accountMatch) {
            // Unknown — preserve indented
            return { account: '', amountStr: null, currency: null, tail: '', isComment: false, isBlank: false, isMetadata: false, rawOther: trimmed };
        }

        const account = accountMatch[1];
        const afterAccount = accountMatch[2].trim();

        if (!afterAccount) {
            return { account, amountStr: null, currency: null, tail: '', isComment: false, isBlank: false, isMetadata: false, rawOther: null };
        }

        // Parse amount + currency [+ tail]
        const amountMatch = AMOUNT_RE.exec(afterAccount);
        if (amountMatch) {
            const amountStr = amountMatch[1];
            const currency = amountMatch[2];
            // Normalise @ and @@ spacing
            const tail = amountMatch[3].trim().replace(/\s*(@{1,2})\s*/g, ' $1 ').trim();
            return { account, amountStr, currency, tail, isComment: false, isBlank: false, isMetadata: false, rawOther: null };
        }

        // Account followed by something we can't parse as amount (e.g. cost basis only)
        return { account, amountStr: null, currency: null, tail: '', isComment: false, isBlank: false, isMetadata: false, rawOther: afterAccount };
    });

    // Widths for alignment
    let maxAccountLen = 0;
    let maxAmountLen  = 0;
    for (const p of postings) {
        if (p.amountStr !== null && !p.isComment && !p.isBlank && !p.isMetadata) {
            maxAccountLen = Math.max(maxAccountLen, p.account.length);
            maxAmountLen  = Math.max(maxAmountLen,  p.amountStr.length);
        }
    }

    const result: string[] = [header];
    for (const p of postings) {
        if (p.isBlank)    { result.push(''); continue; }
        if (p.isComment)  { result.push(`  ${p.account}`); continue; }
        if (p.isMetadata) { result.push(`  ${p.account}`); continue; }
        if (p.rawOther !== null) { result.push(`  ${p.rawOther}`); continue; }
        if (p.amountStr === null) {
            result.push(`  ${p.account}`);
            continue;
        }

        const accountPad = p.account.padEnd(maxAccountLen);
        const amountPad  = p.amountStr.padStart(maxAmountLen);
        const tail = p.tail ? `  ${p.tail}` : '';
        result.push(`  ${accountPad}  ${amountPad} ${p.currency}${tail}`);
    }
    return result;
}

/**
 * Format a non-transaction directive block: normalise sub-line indentation to 2 spaces.
 */
function formatDirectiveBlock(lines: string[]): string[] {
    return lines.map((line, i) => {
        if (i === 0) return line;
        if (line.trim() === '') return '';
        if (line.trimStart().startsWith(';')) return `  ${line.trimStart()}`;
        return `  ${line.trimStart()}`;
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a full Beancount document string.
 * - Normalises posting indentation to 2 spaces
 * - Right-aligns amounts within each transaction block
 * - Normalises @ / @@ price annotation spacing
 * - Preserves blank lines between blocks
 */
export function formatBeancount(text: string): string {
    const crlf = text.includes('\r\n');
    const lines = text.split(/\r?\n/);

    // Remove trailing whitespace per line
    const cleanedLines = lines.map((l) => l.replace(/\s+$/, ''));

    const blocks = splitIntoBlocks(cleanedLines);

    const formatted: string[] = [];
    for (const block of blocks) {
        if (block.isBlank) {
            // Preserve blank separator lines as-is
            formatted.push(...block.lines);
        } else if (TXN_HEADER_RE.test(block.lines[0])) {
            formatted.push(...formatTransactionBlock(block.lines));
        } else if (DIRECTIVE_START_RE.test(block.lines[0])) {
            formatted.push(...formatDirectiveBlock(block.lines));
        } else {
            formatted.push(...block.lines);
        }
    }

    const sep = crlf ? '\r\n' : '\n';
    return formatted.join(sep);
}

// ---------------------------------------------------------------------------
// CodeMirror command
// ---------------------------------------------------------------------------

/**
 * A CodeMirror command that formats the entire document in-place.
 * Returns true if a change was made, false otherwise.
 */
export function formatBeancountCommand(view: EditorView): boolean {
    const current = view.state.doc.toString();
    const next    = formatBeancount(current);
    if (current === next) return false;

    view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
        scrollIntoView: true,
    });
    return true;
}
