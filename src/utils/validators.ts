// src/utils/validators.ts
// Validation helpers: bean-price price-source validation and logo URL validation.

import { spawn } from 'child_process';
import { requestUrl } from 'obsidian';
import type BeancountPlugin from '../main';
import { SystemDetector } from './SystemDetector';
import { splitCommandLine } from './execSafe';

/**
 * Validates a price source by executing bean-price command.
 *
 * @param {BeancountPlugin} plugin         - The plugin instance (for settings).
 * @param {string}          priceMetadata  - Price source string (e.g. "yahoo/AAPL").
 */
export async function validatePriceSource(
    plugin: BeancountPlugin,
    priceMetadata: string
): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!priceMetadata || typeof priceMetadata !== 'string' || priceMetadata.trim() === '') {
        return { success: false, error: 'Empty price metadata' };
    }

    // Get bean-price command from settings or auto-detect
    let beanPriceCommand: string | null = plugin.settings.beanPriceCommand || null;
    if (!beanPriceCommand) {
        const detector = SystemDetector.getInstance();
        const result = await detector.detectBeanPriceCommand();
        beanPriceCommand = result.command || null;
    }
    if (!beanPriceCommand) {
        return { success: false, error: 'bean-price command not configured or found. Please install bean-price (pip install beanprice) and configure it in settings.' };
    }

    const source = priceMetadata.trim();
    // Sanitize source input to prevent shell/command injection
    const sourceRegex = /^[a-zA-Z0-9_\-/.:]+$/;
    if (!sourceRegex.test(source)) {
        return { success: false, error: 'Invalid characters in price metadata. Price metadata must only contain alphanumeric characters, underscores, hyphens, slashes, dots, and colons.' };
    }
    const [command, ...baseArgs] = splitCommandLine(beanPriceCommand);

    if (!command) {
        return { success: false, error: 'Invalid bean-price command configuration.' };
    }

    return new Promise((resolve) => {
        const child = spawn(command, [...baseArgs, '-e', source], {
            windowsHide: true,
            shell: false,
        });

        let stdout = '';
        let stderr = '';

        const timeout = window.setTimeout(() => {
            child.kill();
            resolve({ success: false, error: 'Price source validation timed out after 10 seconds.' });
        }, 10000);

        child.stdout.on('data', (data: Buffer | string) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer | string) => {
            stderr += data.toString();
        });

        child.on('error', (error) => {
            window.clearTimeout(timeout);
            resolve({ success: false, error: error.message });
        });

        child.on('close', (code) => {
            window.clearTimeout(timeout);
            if (code !== 0) {
                const errorMsg = stderr.trim() || `bean-price exited with code ${code}`;
                resolve({ success: false, error: errorMsg });
                return;
            }

            resolve({ success: true, output: stdout.trim() || 'Price source validated successfully' });
        });
    });
}

// Removed local splitCommandLine as it is imported from execSafe.ts

/**
 * Validates a logo URL by checking if it returns an image content-type.
 *
 * @param {string} url - The URL to validate.
 */
export async function validateLogoUrl(
    url: string
): Promise<{ success: boolean; contentType?: string; error?: string }> {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return { success: false, error: 'Empty URL' };
    }

    try {
        const response = await requestUrl({
            url: url,
            method: 'HEAD',
            throw: false,
        });

        if (response.status < 200 || response.status >= 300) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const contentType = response.headers['content-type'] || '';

        if (!contentType.startsWith('image/')) {
            return { success: false, error: `Expected image content type, got: ${contentType}` };
        }

        return { success: true, contentType };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
