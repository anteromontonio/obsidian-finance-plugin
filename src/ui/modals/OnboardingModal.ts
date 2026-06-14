// src/ui/modals/OnboardingModal.ts
import { App, Modal } from 'obsidian';
import type BeancountPlugin from '../../main';
import OnboardingModalComponent from './OnboardingModal.svelte';

export class OnboardingModal extends Modal {
    plugin: BeancountPlugin;
    private component: any;

    constructor(app: App, plugin: BeancountPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        this.modalEl.style.maxWidth = '720px';
        this.modalEl.style.width = '90vw';

        this.component = new (OnboardingModalComponent as any)({
            target: contentEl,
            props: {
                app: this.app,
                plugin: this.plugin,
                modal: this,
            },
        });
    }

    onClose() {
        if (this.component) {
            this.component.$destroy();
            this.component = null;
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
