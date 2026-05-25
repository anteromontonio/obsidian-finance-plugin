// src/ui/views/beancount-file-view.ts
import { TextFileView, WorkspaceLeaf } from 'obsidian';

export const BEANCOUNT_FILE_VIEW_TYPE = 'beancount-file';

/**
 * A plain-text editor view for .beancount and .bean files.
 * Extends TextFileView to avoid Obsidian's Markdown rendering pipeline,
 * so Beancount syntax (*, ;, dates, account names) is never misinterpreted
 * as Markdown.
 */
export class BeancountFileView extends TextFileView {
	private textarea: HTMLTextAreaElement;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return BEANCOUNT_FILE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename ?? 'Beancount File';
	}

	getIcon(): string {
		return 'landmark';
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('beancount-file-view');

		this.textarea = this.contentEl.createEl('textarea', {
			cls: 'beancount-editor'
		});

		this.textarea.addEventListener('input', () => {
			this.requestSave();
		});
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	/** Called by TextFileView when it needs the current editor content to save. */
	getViewData(): string {
		return this.textarea?.value ?? '';
	}

	/** Called by TextFileView when it loads or reloads the file from disk. */
	setViewData(data: string, _clear: boolean): void {
		if (this.textarea) {
			this.textarea.value = data;
		}
	}

	clear(): void {
		if (this.textarea) {
			this.textarea.value = '';
		}
	}
}
