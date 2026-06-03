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
        let timer: NodeJS.Timeout | null = null;
        let isTimedOut = false;

        const maxBuf = options.maxBuffer ?? 50 * 1024 * 1024; // Default to 50MB

        if (options.timeout) {
            timer = setTimeout(() => {
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
            if (timer) clearTimeout(timer);
            reject(err);
        });

        child.on('close', (code) => {
            if (timer) clearTimeout(timer);
            if (isTimedOut) {
                return reject(new Error(`Command timed out after ${options.timeout}ms`));
            }
            if (code !== 0) {
                const err = new Error(`Command failed with exit status ${code}`);
                (err as any).code = code;
                (err as any).stdout = stdout;
                (err as any).stderr = stderr;
                return reject(err);
            }
            resolve({ stdout, stderr });
        });
    });
}
