import { Logger } from './logger';
import type BeancountPlugin from '../main';
import { resolve } from 'path';

/**
 * Converts an absolute path to a vault-relative path if it's within the vault.
 * Normalized path uses forward slashes as required by Obsidian's adapter.
 */
export function getVaultRelativePath(plugin: BeancountPlugin, filePath: string): string {
    const adapter = plugin.app.vault.adapter;
    // @ts-ignore
    if (typeof adapter.getBasePath === 'function') {
        // @ts-ignore
        const basePath = adapter.getBasePath();
        const normalizedBase = resolve(basePath).replace(/\\/g, '/');
        const normalizedFile = resolve(filePath).replace(/\\/g, '/');
        
        if (normalizedFile.startsWith(normalizedBase)) {
            let relPath = normalizedFile.substring(normalizedBase.length);
            if (relPath.startsWith('/')) {
                relPath = relPath.substring(1);
            }
            return relPath;
        }
    }
    // Fallback: if it's already a relative path, or we can't get the base path, return it normalized
    return filePath.replace(/\\/g, '/');
}

/**
 * Asynchronously reads the content of a file within the vault.
 */
export async function readFileContent(plugin: BeancountPlugin, filePath: string): Promise<string> {
    const relativePath = getVaultRelativePath(plugin, filePath);
    const adapter = plugin.app.vault.adapter;
    return await adapter.read(relativePath);
}

/**
 * Converts a Windows path (C:\...) to a WSL path (/mnt/c/...).
 */
export function convertWindowsPathToWsl(windowsPath: string): string {
    const match = windowsPath.match(/^([a-zA-Z]):\\/);
    if (match) {
        const driveLetter = match[1].toLowerCase();
        return windowsPath.replace(/^[a-zA-Z]:\\/, `/mnt/${driveLetter}/`).replace(/\\/g, '/');
    }
    return windowsPath;
}

/**
 * Converts a WSL path (/mnt/c/...) to a Windows path (C:\...).
 */
export function convertWslPathToWindows(wslPath: string): string {
    const match = wslPath.match(/^\/mnt\/([a-zA-Z])\//);
    if (match) {
        const driveLetter = match[1].toUpperCase();
        return wslPath.replace(/^\/mnt\/[a-zA-Z]\//, `${driveLetter}:\\`).replace(/\//g, '\\');
    }
    return wslPath;
}

/**
 * Performs an atomic file write operation using temp file + rename strategy.
 * On Windows, handles the requirement to delete target file before rename.
 *
 * @param {string} filePath - The target file path to write to.
 * @param {string} content  - The content to write.
 */

/**
 * Detects the newline character used in a file.
 * Returns \r\n if CRLF is detected, otherwise \n.
 */
export function getNewlineCharacter(content: string): string {
    return content.includes('\r\n') ? '\r\n' : '\n';
}


// Simple async mutex lock to prevent concurrent write collisions on the same file
class FileLock {
    private locks = new Map<string, Promise<void>>();

    async acquire(filePath: string): Promise<() => void> {
        let release: () => void = () => {};
        const newLock = new Promise<void>(resolve => {
            release = resolve;
        });

        const currentLock = this.locks.get(filePath) || Promise.resolve();
        const nextLock = currentLock.then(() => newLock);
        this.locks.set(filePath, nextLock);

        await currentLock;

        return () => {
            if (this.locks.get(filePath) === nextLock) {
                this.locks.delete(filePath);
            }
            release();
        };
    }
}

export const fileLock = new FileLock();

export async function atomicFileWrite(plugin: BeancountPlugin, filePath: string, content: string): Promise<void> {
    const releaseLock = await fileLock.acquire(filePath);
    try {
        const relativePath = getVaultRelativePath(plugin, filePath);
        const tempRelativePath = `${relativePath}.${Math.random().toString(36).substring(2, 15)}.tmp`;
        const adapter = plugin.app.vault.adapter;

        await adapter.write(tempRelativePath, content);

        try {
            // Delete target file before rename
            if (await adapter.exists(relativePath)) {
                await adapter.remove(relativePath);
            }
            await adapter.rename(tempRelativePath, relativePath);
        } catch {
            // Fallback: direct overwrite
            await adapter.write(relativePath, content);
            if (await adapter.exists(tempRelativePath)) {
                await adapter.remove(tempRelativePath);
            }
        }
    } finally {
        releaseLock();
    }
}

/**
 * Creates a .bak backup of a file before modification.
 *
 * @param {BeancountPlugin} plugin - The plugin instance.
 * @param {string}  filePath     - Path to back up.
 * @param {boolean} createBackup - Whether to actually create the backup.
 * @param {string}  functionName - Calling function name for log context.
 */
export async function createBackupFile(
    plugin: BeancountPlugin,
    filePath: string,
    createBackup: boolean,
    functionName: string
): Promise<void> {
    if (!createBackup) return;

    const relativePath = getVaultRelativePath(plugin, filePath);
    const backupRelativePath = `${relativePath}.bak`;
    try {
        const adapter = plugin.app.vault.adapter;
        if (await adapter.exists(relativePath)) {
            await adapter.copy(relativePath, backupRelativePath);
            Logger.log(`[${functionName}] Created backup: ${backupRelativePath}`);
        } else {
            Logger.warn(`[${functionName}] Source file for backup does not exist: ${relativePath}`);
        }
    } catch (backupError) {
        Logger.warn(`[${functionName}] Failed to create backup:`, backupError);
        // Continue anyway — backup failure should not block the save
    }
}
