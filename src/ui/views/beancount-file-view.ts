// src/ui/views/beancount-file-view.ts
import { TextFileView, WorkspaceLeaf } from 'obsidian';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';

export const BEANCOUNT_FILE_VIEW_TYPE = 'beancount-file';

/**
 * A CodeMirror 6 editor view for .beancount and .bean files.
 * Extends TextFileView to avoid Obsidian's Markdown rendering pipeline,
 * so Beancount syntax (*, ;, dates, account names) is never misinterpreted
 * as Markdown.
 */
export class BeancountFileView extends TextFileView {
	private editorView: EditorView;

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

		const editorContainer = this.contentEl.createDiv({ cls: 'beancount-editor' });

		const state = EditorState.create({
			doc: '',
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				drawSelection(),
				highlightActiveLine(),
				history(),
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					...searchKeymap,
					indentWithTab,
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						this.requestSave();
					}
				}),
				EditorView.theme({
					'&': { height: '100%' },
					'.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-monospace)', fontSize: 'var(--font-text-size)' },
					'.cm-content': { padding: 'var(--size-4-4)', caretColor: 'var(--text-normal)' },
					'&.cm-focused': { outline: 'none' },
				}),
			],
		});

		this.editorView = new EditorView({
			state,
			parent: editorContainer,
		});
	}

	async onClose(): Promise<void> {
		this.editorView?.destroy();
		this.contentEl.empty();
	}

	/** Called by TextFileView when it needs the current editor content to save. */
	getViewData(): string {
		return this.editorView?.state.doc.toString() ?? '';
	}

	/** Called by TextFileView when it loads or reloads the file from disk. */
	setViewData(data: string, _clear: boolean): void {
		if (!this.editorView) return;
		this.editorView.dispatch({
			changes: {
				from: 0,
				to: this.editorView.state.doc.length,
				insert: data,
			},
		});
	}

	clear(): void {
		if (!this.editorView) return;
		this.editorView.dispatch({
			changes: {
				from: 0,
				to: this.editorView.state.doc.length,
				insert: '',
			},
		});
	}
}
