// src/lang/beancount-lint.ts
// CodeMirror 6 linter integration using the existing bean-query `errors` query.
// Surfaces Beancount validation errors as inline squiggly underlines in the editor.

import { linter, lintGutter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type BeancountPlugin from '../main';
import { runQuery } from '../utils/queryRunner';
import { Logger } from '../utils/logger';
import { convertWslPathToWindows } from '../utils/fileEditor';

export type LintMode = 'off' | 'on-save' | 'on-change';

// ---------------------------------------------------------------------------
// BQL errors query
// ---------------------------------------------------------------------------

/**
 * Returns a `getErrors` query result. Runs the special `.errors` BQL command,
 * which outputs validation errors in plain text (not CSV).
 * We run it via the standard runQuery / bean-query infrastructure so it
 * automatically respects the user's configured command and WSL path handling.
 */
export async function getErrors(plugin: BeancountPlugin): Promise<LintError[]> {
    // `.errors` is a built-in BQL command.
    const output = await runQuery(plugin, '.errors', undefined, 'text');
    return parseLintErrors(output);
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
 * Parse the plain text output of `bean-query … .errors` into structured LintError objects.
 *
 * Expected line format (handles Windows drive letters and relative paths):
 *   <file>:<line>:<message>
 * e.g.:
 *   C:\Users\Asus\Documents\Vaults\plugin_maker\Finances\transactions\2026.beancount:75: Transaction does not balance: (-2.00 USD)
 */
export function parseLintErrors(output: string): LintError[] {
    const errors: LintError[] = [];
    const lines = output.replace(/\r/g, '').split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Match pattern: <file>:<line>:<message>
        // Using a regex that handles Windows drive letters correctly
        const match = line.match(/^(.*):(\d+):\s*(.*)$/);
        if (match) {
            const filename = match[1].trim();
            const lineno = parseInt(match[2], 10);
            const message = match[3].trim();
            if (filename && !isNaN(lineno) && message) {
                errors.push({ filename, lineno, message });
            }
        }
    }

    return errors;
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

    // Normalise path separators and handle WSL paths for comparison
    const normalise = (p: string) => convertWslPathToWindows(p).replace(/\\/g, '/').toLowerCase();
    const openNorm  = normalise(openFilePath);

    for (const err of errors) {
        // Only show diagnostics for the currently-open file
        const errNorm = normalise(err.filename);
        if (errNorm !== openNorm && !openNorm.endsWith('/' + errNorm)) continue;

        const lineNum = err.lineno - 1; // 0-based
        if (lineNum < 0 || lineNum >= lineOffsets.length) continue;

        const lineStart = lineOffsets[lineNum];
        const lineEnd   = lineNum + 1 < lineOffsets.length
            ? lineOffsets[lineNum + 1] - 1
            : docText.length;

        // Highlight from line start to end-of-line (at least 1 char)
        const from = lineStart;
        const to   = Math.max(lineEnd, lineStart + 1);

        // Detect warning status in error message
        const severity = /warning/i.test(err.message) ? 'warning' : 'error';

        diagnostics.push({ from, to, severity, message: err.message });
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
