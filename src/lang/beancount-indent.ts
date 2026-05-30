// src/lang/beancount-indent.ts
// CodeMirror 6 smart-indentation extension for Beancount files.
//
// Rules (matching Fava / bean-format style):
//   • Directive-start lines (date, option, plugin, include, …) → indent 0
//   • Posting / metadata lines (2-space-indented content inside a txn block) → indent 2
//   • Blank lines → indent 0 (let the user decide)

import { indentService } from '@codemirror/language';
import type { Extension } from '@codemirror/state';

// Patterns for line classification
const DIRECTIVE_START_RE = /^(?:\d{4}-\d{2}-\d{2}|option\b|plugin\b|include\b|pushtag\b|poptag\b|query\b|custom\b)/;
const POSTING_RE         = /^\s+\S/;   // lines that begin with whitespace (postings, metadata)
const BLANK_RE           = /^\s*$/;

/**
 * Returns a CodeMirror extension that supplies smart indentation for Beancount
 * files. When the user presses Enter:
 *   - After a directive-start line  → 0 spaces
 *   - After a posting / metadata line → 2 spaces (continue the block)
 *   - After a blank line → 0 spaces
 */
export function beancountIndent(): Extension {
    return indentService.of((_context, pos) => {
        const state = _context.state;
        const currentLine = state.doc.lineAt(pos);
        const lineNumber  = currentLine.number;

        // Look at the *previous* non-blank line to decide what to do
        let prevLineText = '';
        for (let n = lineNumber - 1; n >= 1; n--) {
            const text = state.doc.line(n).text;
            if (!BLANK_RE.test(text)) {
                prevLineText = text;
                break;
            }
        }

        if (!prevLineText) return 0;

        // If the previous real line is a posting/metadata line → keep 2-space indent
        if (POSTING_RE.test(prevLineText)) return 2;

        // If the previous real line is a directive start → 2 spaces (start of block)
        if (DIRECTIVE_START_RE.test(prevLineText)) return 2;

        // Otherwise (e.g., blank, comment, or end of block) → 0
        return 0;
    });
}
