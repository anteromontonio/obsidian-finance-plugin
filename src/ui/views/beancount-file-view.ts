// src/ui/views/beancount-file-view.ts
import { TextFileView, WorkspaceLeaf } from 'obsidian';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { beancount } from '../../lang/beancount-language';
import { beancountCompletionSource, invalidateAccountCache } from '../../lang/beancount-autocomplete';
import { beancountSnippetSource } from '../../lang/beancount-snippets';
import { autocompletion } from '@codemirror/autocomplete';
import { beancountIndent } from '../../lang/beancount-indent';
import { formatBeancountCommand } from '../../lang/beancount-format';
import { beancountLinter } from '../../lang/beancount-lint';
import type BeancountPlugin from '../../main';

export const BEANCOUNT_FILE_VIEW_TYPE = 'beancount-file';

/**
 * A CodeMirror 6 editor view for .beancount and .bean files.
 * Extends TextFileView to avoid Obsidian's Markdown rendering pipeline,
 * so Beancount syntax (*, ;, dates, account names) is never misinterpreted
 * as Markdown.
 */
export class BeancountFileView extends TextFileView {
	private editorView: EditorView;
	private plugin: BeancountPlugin | null;
	/** Absolute filesystem path to the open file (for lint error filtering). */
	private filePath = '';

	constructor(leaf: WorkspaceLeaf, plugin?: BeancountPlugin) {
		super(leaf);
		this.plugin = plugin ?? null;
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

		const autocompleteEnabled =
			this.plugin != null && this.plugin.settings.accountAutocomplete;

		// Lint extension: uses bean-query `errors` query; file path is populated lazily in setViewData.
		const lintMode = this.plugin?.settings.lintMode ?? 'off';
		const lintExtensions = (this.plugin && lintMode !== 'off')
			? beancountLinter(this.plugin, () => this.filePath, lintMode)
			: [];

		const state = EditorState.create({
			doc: '',
			extensions: [
				beancount(),
				lineNumbers(),
				highlightActiveLineGutter(),
				drawSelection(),
				highlightActiveLine(),
				history(),
				beancountIndent(),
				keymap.of([
					// Format Document: Ctrl+Shift+F (Windows/Linux) or Cmd+Shift+F (Mac)
					{ key: 'Ctrl-Shift-f', run: formatBeancountCommand },
					{ key: 'Cmd-Shift-f',  run: formatBeancountCommand },
					...defaultKeymap,
					...historyKeymap,
					...searchKeymap,
					indentWithTab,
				]),
				autocompletion({
					override: [
						beancountSnippetSource,
						...(autocompleteEnabled && this.plugin
							? [beancountCompletionSource(this.plugin)]
							: []),
					],
					activateOnTyping: true,
				}),
				...lintExtensions,
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
		if (!this.editorView) return '';
		const raw = this.editorView.state.doc.toString();
		// Apply format-on-save if enabled
		if (this.plugin?.settings.formatOnSave) {
			formatBeancountCommand(this.editorView);
			return this.editorView.state.doc.toString();
		}
		return raw;
	}

	/** Called by TextFileView when it loads or reloads the file from disk. */
	setViewData(data: string, _clear: boolean): void {
		if (!this.editorView) return;
		// Capture the absolute filesystem path for lint error file-matching
		if (this.file && this.plugin) {
			// @ts-ignore — app.vault.adapter.getFullPath exists in Obsidian's FileSystemAdapter
			this.filePath = (this.app as any).vault.adapter.getFullPath
				? (this.app as any).vault.adapter.getFullPath(this.file.path)
				: this.file.path;
		}
		// Invalidate the account cache so completions reflect any new open directives
		if (this.plugin) invalidateAccountCache(this.plugin);
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
