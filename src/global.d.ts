// src/global.d.ts

import 'obsidian';

declare module "*.svelte" {
  import { SvelteComponent } from "svelte";
  export default SvelteComponent;
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
    /** Available in Obsidian's FileSystemAdapter to resolve vault-relative paths. */
    getFullPath?(path: string): string;
  }
}