// src/global.d.ts

import 'obsidian';

declare module "*.svelte" {
  import { SvelteComponent } from "svelte";
  export default SvelteComponent;
}

// Node.js modules for settings validation
declare module "child_process" {
  export function exec(command: string, options?: any, callback?: (error: any, stdout: string, stderr: string) => void): any;
}

declare module "util" {
  export function promisify(fn: (...args: any[]) => any): (...args: any[]) => Promise<any>;
}

declare module "fs" {
  export function existsSync(path: string): boolean;
}

declare module "path" {
  export function resolve(...paths: string[]): string;
}

declare global {
  interface HTMLElement {
    setCssStyles(styles: Partial<CSSStyleDeclaration>): void;
    setCssProps(props: Record<string, string>): void;
  }

  interface SVGElement {
    setCssStyles(styles: Partial<CSSStyleDeclaration>): void;
    setCssProps(props: Record<string, string>): void;
  }
}

declare module 'obsidian' {
  interface DataAdapter {
    getBasePath(): string;
  }
}