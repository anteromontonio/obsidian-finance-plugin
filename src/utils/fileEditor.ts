// src/utils/fileEditor.ts
// File I/O helpers: atomic writes, backups, path conversion (WSL ↔ Windows)

import { writeFile, copyFile } from 'fs/promises';
import { existsSync, unlinkSync, renameSync } from 'fs';
import { Logger } from './logger';

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
export async function atomicFileWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, content, 'utf-8');

    try {
        // On Windows, delete the target file before renaming
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
        renameSync(tempPath, filePath);
    } catch (renameError) {
        // Fallback: direct overwrite
        await writeFile(filePath, content, 'utf-8');
        if (existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
    }
}

/**
 * Creates a .bak backup of a file before modification.
 *
 * @param {string}  filePath     - Path to back up.
 * @param {boolean} createBackup - Whether to actually create the backup.
 * @param {string}  functionName - Calling function name for log context.
 */
export async function createBackupFile(
    filePath: string,
    createBackup: boolean,
    functionName: string
): Promise<void> {
    if (!createBackup) return;

    const backupPath = `${filePath}.bak`;
    try {
        await copyFile(filePath, backupPath);
        Logger.log(`[${functionName}] Created backup: ${backupPath}`);
    } catch (backupError) {
        console.warn(`[${functionName}] Failed to create backup:`, backupError);
        // Continue anyway — backup failure should not block the save
    }
}
