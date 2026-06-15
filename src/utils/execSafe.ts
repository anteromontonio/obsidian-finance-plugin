import { spawn } from 'child_process';

/**
 * Splits a command line string into an executable and its arguments,
 * while preserving quoted arguments (both double and single quotes).
 * E.g., `python3 -m beancount.query` -> `["python3", "-m", "beancount.query"]`
 */
export function splitCommandLine(commandLine: string): string[] {
    const parts: string[] = [];
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(commandLine)) !== null) {
        parts.push(match[1] ?? match[2] ?? match[0]);
    }

    return parts;
}

interface ExecSafeOptions {
    timeout?: number;
    maxBuffer?: number;
}

/** Error thrown when a spawned command exits with a non-zero status code. */
class SpawnError extends Error {
    code: number | null;
    stdout: string;
    stderr: string;

    constructor(message: string, code: number | null, stdout: string, stderr: string) {
        super(message);
        this.name = 'SpawnError';
        this.code = code;
        this.stdout = stdout;
        this.stderr = stderr;
    }
}

/**
 * Executes a command safely using child_process.spawn with shell: false.
 * Prevents shell injection by bypassing shell command parsing entirely.
 * On Windows, if running a .bat or .cmd script, shell: true is enabled
 * automatically to allow the OS to run the script.
 *
 * @param commandLine The base command line string (e.g. "python3" or "python3 -m beancount.query")
 * @param additionalArgs Arguments to append to the command (unparsed/safe)
 * @param options Execution options (timeout, maxBuffer)
 */
export function execSafe(
    commandLine: string,
    additionalArgs: string[] = [],
    options: ExecSafeOptions = {}
): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const parts = splitCommandLine(commandLine.trim());
        const command = parts[0];
        const args = [...parts.slice(1), ...additionalArgs];

        if (!command) {
            return reject(new Error('Invalid command: Empty or white-space command provided.'));
        }

        // On Windows, executing a batch or cmd file requires a shell.
        // For standard native executables, shell: false is much safer.
        const isWindows = process.platform === 'win32';
        const isShellRequired = isWindows && (
            command.toLowerCase().endsWith('.cmd') || 
            command.toLowerCase().endsWith('.bat')
        );

        const child = spawn(command, args, {
            windowsHide: true,
            shell: isShellRequired,
        });

        let stdout = '';
        let stderr = '';
        let timer: number | null = null;
        let isTimedOut = false;

        const maxBuf = options.maxBuffer ?? 50 * 1024 * 1024; // Default to 50MB

        if (options.timeout) {
            timer = window.setTimeout(() => {
                isTimedOut = true;
                child.kill();
            }, options.timeout);
        }

        child.stdout.on('data', (data: Buffer | string) => {
            stdout += data.toString();
            if (stdout.length > maxBuf) {
                child.kill();
                reject(new Error(`stdout maxBuffer (${maxBuf} bytes) exceeded`));
            }
        });

        child.stderr.on('data', (data: Buffer | string) => {
            stderr += data.toString();
            if (stderr.length > maxBuf) {
                child.kill();
                reject(new Error(`stderr maxBuffer (${maxBuf} bytes) exceeded`));
            }
        });

        child.on('error', (err) => {
            if (timer) window.clearTimeout(timer);
            reject(err);
        });

        child.on('close', (code) => {
            if (timer) window.clearTimeout(timer);
            if (isTimedOut) {
                return reject(new Error(`Command timed out after ${options.timeout}ms`));
            }
            if (code !== 0) {
                return reject(new SpawnError(`Command failed with exit status ${code}`, code, stdout, stderr));
            }
            resolve({ stdout, stderr });
        });
    });
}
