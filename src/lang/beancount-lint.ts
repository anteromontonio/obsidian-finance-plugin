// src/lang/beancount-lint.ts
// CodeMirror 6 linter integration: runs `bean-check` on the active file
// and surfaces errors/warnings as inline diagnostics (squiggly underlines).

import { linter, lintGutter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { exec } from 'child_process';
import { Notice } from 'obsidian';
import { SystemDetector } from '../utils/SystemDetector';
import type BeancountPlugin from '../main';
import { Logger } from '../utils/logger';

export type LintMode = 'off' | 'on-save' | 'on-change';

/**
 * Parse bean-check stderr output into CodeMirror Diagnostics.
 *
 * bean-check output format:
 *   /path/to/file.beancount:LINE:COL MESSAGE_TYPE message text
 *   or (without col)
 *   /path/to/file.beancount:LINE MESSAGE_TYPE message text
 *
 * We map ERROR → 'error', WARNING → 'warning', everything else → 'info'.
 */
function parseBeanCheckOutput(
    stderr: string,
    docText: string,
    filePath: string
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = stderr.split('\n');

    // Pre-compute line offsets for fast character-position lookups
    const lineOffsets: number[] = [];
    let offset = 0;
    for (const line of docText.split('\n')) {
        lineOffsets.push(offset);
        offset += line.length + 1; // +1 for '\n'
    }

    // Match lines that reference our file (handle both absolute and relative paths)
    const fileBasename = filePath.replace(/\\/g, '/').split('/').pop() ?? '';

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        // Pattern: <file>:<line>:<col>: <type> <message>
        // or:      <file>:<line>: <type> <message>
        // Note: On Windows paths include drive letter like C:\..., so we match
        // everything before the first :\d+ that isn't a Windows drive letter.
        const match = trimmed.match(
            /^(?:.*[\\/])?([^:\\/]+\.(?:beancount|bean)):(\d+)(?::(\d+))?:?\s*(ERROR|WARNING|INFO|NOTE|DEBUG)?\s*(.*)/i
        );
        if (!match) continue;

        const matchedFile = match[1];
        // Only include diagnostics for the current file
        if (matchedFile && fileBasename && matchedFile !== fileBasename) continue;

        const lineNum = parseInt(match[2], 10) - 1; // 0-based
        const colNum = match[3] ? parseInt(match[3], 10) - 1 : 0;
        const severity = (match[4] ?? 'ERROR').toUpperCase();
        const message = match[5]?.trim() || 'Beancount error';

        if (lineNum < 0 || lineNum >= lineOffsets.length) continue;

        const lineStart = lineOffsets[lineNum];
        const lineEnd = lineNum + 1 < lineOffsets.length
            ? lineOffsets[lineNum + 1] - 1
            : docText.length;

        const from = Math.min(lineStart + colNum, lineEnd);
        // Highlight to end of the token (at least one character, at most end of line)
        const to = Math.max(from + 1, lineEnd);

        let cmSeverity: 'error' | 'warning' | 'info' = 'error';
        if (severity === 'WARNING' || severity === 'NOTE') cmSeverity = 'warning';
        else if (severity === 'INFO' || severity === 'DEBUG') cmSeverity = 'info';

        diagnostics.push({ from, to, severity: cmSeverity, message });
    }

    return diagnostics;
}

/** Cache for the resolved bean-check executable path to avoid re-detection on every lint run. */
let _beanCheckPath: string | null | undefined = undefined; // undefined = not yet resolved

async function resolveBeanCheck(plugin: BeancountPlugin): Promise<string | null> {
    if (_beanCheckPath !== undefined) return _beanCheckPath;

    // Check if user's beancountCommand gives us a hint about wsl prefix
    const userCmd = plugin.settings.beancountCommand ?? '';
    const useWsl = userCmd.toLowerCase().startsWith('wsl');

    const detector = SystemDetector.getInstance();
    await detector.getSystemInfo();

    if (useWsl) {
        // In WSL mode, use wsl bean-check
        _beanCheckPath = 'wsl bean-check';
        return _beanCheckPath;
    }

    const info = await detector.findExecutable('bean-check');
    if (info.found && info.accessible && info.path) {
        _beanCheckPath = info.path;
    } else {
        _beanCheckPath = 'bean-check'; // fallback, may fail gracefully
    }
    return _beanCheckPath;
}

/** Runs bean-check synchronously (via exec) and returns parsed diagnostics. */
async function runBeanCheck(
    filePath: string,
    docText: string,
    plugin: BeancountPlugin
): Promise<Diagnostic[]> {
    const beanCheck = await resolveBeanCheck(plugin);
    if (!beanCheck) return [];

    return new Promise((resolve) => {
        // Quote the file path to handle spaces
        const cmd = `${beanCheck} "${filePath.replace(/\\/g, '/')}"`;
        Logger.log(`[beancount-lint] Running: ${cmd}`);

        exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 15000 }, (_error, _stdout, stderr) => {
            // bean-check exits with code 1 when there are errors — that's expected.
            // We only care about the stderr output for diagnostics.
            const diagnostics = parseBeanCheckOutput(stderr || '', docText, filePath);
            Logger.log(`[beancount-lint] Found ${diagnostics.length} diagnostics`);
            resolve(diagnostics);
        });
    });
}

/**
 * Create a CodeMirror linter extension that runs `bean-check` on a debounced schedule.
 *
 * @param plugin       - The BeancountPlugin instance (for settings and file path).
 * @param getFilePath  - A function that returns the absolute path to the currently-open file.
 *                       Called lazily on each lint run so it always reflects the latest value.
 * @param mode         - Lint trigger mode: 'on-save' | 'on-change'.
 * @returns A CodeMirror Extension array: [linter, lintGutter].
 */
export function beancountLinter(
    plugin: BeancountPlugin,
    getFilePath: () => string,
    mode: Exclude<LintMode, 'off'>
): Extension[] {
    let beanCheckAvailable: boolean | null = null; // null = not yet tested
    let noticeDismissed = false;

    const lint = linter(async (view) => {
        const filePath = getFilePath();
        if (!filePath) return []; // file not yet loaded

        // Lazily check whether bean-check is available on first run
        if (beanCheckAvailable === null) {
            const path = await resolveBeanCheck(plugin);
            if (!path) {
                beanCheckAvailable = false;
            } else {
                const detector = SystemDetector.getInstance();
                const result = await detector.testCommand(`${path} --help`, 5000);
                beanCheckAvailable = result.success;
            }

            if (!beanCheckAvailable && !noticeDismissed) {
                noticeDismissed = true;
                new Notice(
                    '⚠ Beancount Lint: bean-check not found. Install beancount (pip install beancount) or disable linting in Settings → BQL → Editor Settings.',
                    8000
                );
            }
        }

        if (!beanCheckAvailable) return [];

        const docText = view.state.doc.toString();
        try {
            return await runBeanCheck(filePath, docText, plugin);
        } catch (err) {
            Logger.error('[beancount-lint] Error running bean-check:', err);
            return [];
        }
    }, {
        // Debounce: 2s for on-change, 500ms for on-save (on-save is already triggered infrequently)
        delay: mode === 'on-change' ? 2000 : 500,
    });

    return [lint, lintGutter()];
}

/**
 * Exported utility: invalidate the bean-check path cache
 * (e.g. after user changes settings).
 */
export function invalidateBeanCheckCache(): void {
    _beanCheckPath = undefined;
}
