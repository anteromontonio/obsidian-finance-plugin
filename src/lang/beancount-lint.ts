// src/lang/beancount-lint.ts
// CodeMirror 6 linter integration using the existing bean-query `errors` query.
// Surfaces Beancount validation errors as inline squiggly underlines in the editor.

import { linter, lintGutter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type BeancountPlugin from '../main';
import { runQuery } from '../utils/queryRunner';
import { Logger } from '../utils/logger';

export type LintMode = 'off' | 'on-save' | 'on-change';

// ---------------------------------------------------------------------------
// BQL errors query
// ---------------------------------------------------------------------------

/**
 * Returns a `getErrors` query result. The BQL `errors` special query returns a
 * table with columns: filename, lineno, message (and sometimes entry).
 * We run it via the standard runQuery / bean-query infrastructure so it
 * automatically respects the user's configured command and WSL path handling.
 */
export async function getErrors(plugin: BeancountPlugin): Promise<LintError[]> {
    // `errors` is a built-in BQL keyword — no SELECT/FROM needed.
    const csv = await runQuery(plugin, 'errors', undefined, 'csv');
    return parseLintErrorsCsv(csv);
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export interface LintError {
    filename: string;
    lineno: number;
    message: string;
}

/**
 * Parse the CSV output of `bean-query … errors` into structured LintError objects.
 *
 * Expected CSV header line (may vary slightly between beancount versions):
 *   filename,lineno,message
 * or
 *   filename,lineno,message,entry
 */
function parseLintErrorsCsv(csv: string): LintError[] {
    const errors: LintError[] = [];
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return errors; // no header or no data

    // Parse header to find column indices
    const header = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());
    const filenameIdx = header.findIndex(h => h === 'filename');
    const linenoIdx   = header.findIndex(h => h === 'lineno');
    const messageIdx  = header.findIndex(h => h.startsWith('message'));

    if (filenameIdx < 0 || linenoIdx < 0 || messageIdx < 0) {
        Logger.log('[beancount-lint] Unexpected errors CSV header:', lines[0]);
        return errors;
    }

    for (let i = 1; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i]);
        const filename = cols[filenameIdx]?.replace(/^"|"$/g, '').trim() ?? '';
        const lineno   = parseInt(cols[linenoIdx]?.replace(/^"|"$/g, '') ?? '0', 10);
        const message  = cols[messageIdx]?.replace(/^"|"$/g, '').trim() ?? '';

        if (filename && lineno > 0 && message) {
            errors.push({ filename, lineno, message });
        }
    }

    return errors;
}

/** Naive CSV line splitter that handles double-quoted fields. */
function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// ---------------------------------------------------------------------------
// CodeMirror diagnostic conversion
// ---------------------------------------------------------------------------

/**
 * Convert a list of LintErrors (for the currently-open file only) into
 * CodeMirror Diagnostics by mapping line numbers to character offsets.
 */
function toDiagnostics(
    errors: LintError[],
    docText: string,
    openFilePath: string
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Pre-compute line start offsets
    const lineOffsets: number[] = [];
    let offset = 0;
    for (const line of docText.split('\n')) {
        lineOffsets.push(offset);
        offset += line.length + 1;
    }

    // Normalise path separators for comparison
    const normalise = (p: string) => p.replace(/\\/g, '/').toLowerCase();
    const openNorm  = normalise(openFilePath);

    for (const err of errors) {
        // Only show diagnostics for the currently-open file
        if (!normalise(err.filename).endsWith(openNorm.split('/').pop() ?? '')) continue;

        const lineNum = err.lineno - 1; // 0-based
        if (lineNum < 0 || lineNum >= lineOffsets.length) continue;

        const lineStart = lineOffsets[lineNum];
        const lineEnd   = lineNum + 1 < lineOffsets.length
            ? lineOffsets[lineNum + 1] - 1
            : docText.length;

        // Highlight from line start to end-of-line (at least 1 char)
        const from = lineStart;
        const to   = Math.max(lineEnd, lineStart + 1);

        diagnostics.push({ from, to, severity: 'error', message: err.message });
    }

    return diagnostics;
}

// ---------------------------------------------------------------------------
// Public CodeMirror extension factory
// ---------------------------------------------------------------------------

/**
 * Create a CodeMirror linter extension that uses the existing `runQuery`
 * infrastructure to run `errors` via bean-query and map results to inline
 * squiggly underlines.
 *
 * @param plugin       - The BeancountPlugin instance (settings + command config).
 * @param getFilePath  - Returns the absolute path of the currently-open file
 *                       (called lazily on each lint run so it's always current).
 * @param mode         - 'on-save' (500 ms delay) or 'on-change' (2 s debounce).
 * @returns CodeMirror Extension array: [linter, lintGutter].
 */
export function beancountLinter(
    plugin: BeancountPlugin,
    getFilePath: () => string,
    mode: Exclude<LintMode, 'off'>
): Extension[] {
    const lint = linter(async (view) => {
        const filePath = getFilePath();
        if (!filePath) return []; // file not yet loaded

        // Ensure the plugin is configured (has a beancountCommand set)
        if (!plugin.settings.beancountCommand || !plugin.settings.beancountFilePath) {
            return [];
        }

        const docText = view.state.doc.toString();
        try {
            const errors = await getErrors(plugin);
            return toDiagnostics(errors, docText, filePath);
        } catch (err) {
            // Silently swallow errors (e.g. bean-query not running, file not loaded yet)
            Logger.log('[beancount-lint] Lint run skipped:', (err as Error).message);
            return [];
        }
    }, {
        delay: mode === 'on-change' ? 2000 : 500,
    });

    return [lint, lintGutter()];
}
