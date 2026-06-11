<!-- src/ui/modals/OnboardingModal.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { App, Notice, TFile } from 'obsidian';
	import type BeancountPlugin from '../../main';
	import { DEMO_LEDGER_CONTENT } from '../../services/demo-ledger';
	import { Logger } from '../../utils/logger';
	import { migrateToStructuredLayout } from '../../utils/structuredLayout';
	import { SystemDetector } from '../../utils/SystemDetector';
	import { UNIFIED_DASHBOARD_VIEW_TYPE } from '../views/dashboard/unified-dashboard-view';

	// Props passed from Modal wrapper
	export let app: App;
	export let plugin: BeancountPlugin;
	export let modal: any;

	// State
	let currentStep: 'prerequisites' | 'file-setup' | 'verification' = 'prerequisites';

	// Prerequisites state
	let prerequisitesChecked = false;
	let pythonValid = false;
	let beanQueryValid = false;
	let beanPriceValid = false;
	let pythonCommand: string | null = null;
	let beanQueryCommand: string | null = null;
	let beanPriceCommand: string | null = null;
	let pythonVersion: string | null = null;
	let beanQueryVersion: string | null = null;
	let beanPriceVersion: string | null = null;
	let prerequisiteErrors: string[] = [];
	let isCheckingPrereqs = false;

	// Platform details for instructions
	let platform = "Unknown";
	let platformDisplay = "Unknown";

	// Choices & fields
	let dataChoice: 'demo' | 'existing' | null = null;
	let existingFilePath = '';
	let structuredFolderName = 'Finances';
	let fileOrganization: 'yearly' | 'monthly' = 'yearly';
	let operatingCurrency = plugin.settings.operatingCurrency || 'USD';

	// Scan results
	let beancountFiles: string[] = [];
	let isSubmitting = false;

	onMount(async () => {
		// Detect platform
		const detector = SystemDetector.getInstance();
		try {
			const systemInfo = await detector.getSystemInfo();
			platform = systemInfo.platform || process.platform;
			platformDisplay = systemInfo.platformDisplay || "Unknown";
		} catch (e) {
			platform = process.platform;
		}

		// List files for existing file dropdown
		const allFiles = app.vault.getFiles();
		beancountFiles = allFiles
			.filter(file => file.extension === 'beancount')
			.map(file => file.path);
		
		if (beancountFiles.length > 0) {
			existingFilePath = beancountFiles[0];
		}
	});

	async function checkPrerequisites() {
		if (isCheckingPrereqs) return;
		isCheckingPrereqs = true;

		try {
			const detector = SystemDetector.getInstance();

			// Detect Python
			Logger.log('[Onboarding] Detecting Python environment...');
			const pythonResult = await detector.detectPythonEnvironment(false);

			// Detect bean-query
			Logger.log('[Onboarding] Detecting bean-query command...');
			let beanQueryResult = await detector.detectBeanQueryCommand(false, undefined);

			// If auto-detection failed but we have a saved setting, verify it
			if (!beanQueryResult.isValid && plugin.settings.beancountCommand) {
				Logger.log('[Onboarding] Auto-detection failed; trying saved beancountCommand...');
				const savedCmd = plugin.settings.beancountCommand;
				const savedResult = await detector.testCommand(`${savedCmd} --version`);
				if (savedResult.success) {
					const versionMatch = (savedResult.output || '').match(/(\d+\.\d+\.\d+)/);
					beanQueryResult = {
						command: savedCmd,
						version: versionMatch ? versionMatch[1] : 'unknown',
						isValid: true,
						errors: []
					};
				}
			}

			// Detect bean-price (optional)
			Logger.log('[Onboarding] Detecting bean-price command...');
			const beanPriceResult = await detector.detectBeanPriceCommand(false);

			// Update Svelte State
			pythonValid = pythonResult.isValid;
			pythonCommand = pythonResult.command;
			pythonVersion = pythonResult.version;

			beanQueryValid = beanQueryResult.isValid;
			beanQueryCommand = beanQueryResult.command;
			beanQueryVersion = beanQueryResult.version;

			beanPriceValid = beanPriceResult.isValid;
			beanPriceCommand = beanPriceResult.command;
			beanPriceVersion = beanPriceResult.version;

			prerequisiteErrors = [...pythonResult.errors, ...beanQueryResult.errors];
			prerequisitesChecked = true;

			// Save to settings immediately if valid
			if (beanQueryValid && beanQueryCommand) {
				plugin.settings.beancountCommand = beanQueryCommand;
			}
			if (beanPriceValid && beanPriceCommand) {
				plugin.settings.beanPriceCommand = beanPriceCommand;
			}
			await plugin.saveSettings();

			Logger.log('[Onboarding] Svelte prerequisites check completed', {
				pythonValid,
				beanQueryValid,
				beanPriceValid
			});
		} catch (error) {
			Logger.error('[Onboarding] Prerequisites check failed', error);
			new Notice('Prerequisites check failed. Check console for details.');
		} finally {
			isCheckingPrereqs = false;
		}
	}

	function selectDataChoice(choice: 'demo' | 'existing') {
		dataChoice = choice;
		if (choice === 'demo') {
			operatingCurrency = 'USD'; // Demo data uses USD
		}
	}

	async function handleFinish() {
		if (isSubmitting) return;

		if (!dataChoice) {
			new Notice('Please select an option');
			return;
		}

		if (dataChoice === 'existing' && !existingFilePath.trim()) {
			new Notice('Please select or enter an existing Beancount file path');
			return;
		}

		isSubmitting = true;

		try {
			if (dataChoice === 'demo') {
				await handleDemoStructured();
			} else {
				await handleExistingStructured();
			}

			currentStep = 'verification';
			new Notice('🎉 Setup completed successfully!');
		} catch (error: any) {
			Logger.error('[Onboarding] Setup failed', error);
			const msg = error?.message || 'Setup failed. See console for details.';
			new Notice(`Setup failed: ${msg}`, 8000);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDemoStructured() {
		Logger.log('Onboarding: Demo + Structured Setup');
		const tempFilePath = '_demo_temp.beancount';
		const adapter = app.vault.adapter;

		if (await adapter.exists(tempFilePath)) {
			try {
				await adapter.remove(tempFilePath);
				await new Promise(r => setTimeout(r, 200));
			} catch (e: any) {
				throw new Error(`Could not delete existing temp file: ${e.message}`);
			}
		}

		await adapter.write(tempFilePath, DEMO_LEDGER_CONTENT);
		await new Promise(r => setTimeout(r, 300));

		const tempFile = app.vault.getAbstractFileByPath(tempFilePath) as TFile;
		if (!tempFile) {
			throw new Error('Failed to register temporary demo file in vault');
		}

		// @ts-ignore
		const absolutePath = adapter.getFullPath(tempFile.path);

		// Temporarily configure plugin path to temp file for migration
		plugin.settings.beancountFilePath = absolutePath;
		plugin.settings.fileOrganization = fileOrganization;
		await plugin.saveSettings();

		const result = await migrateToStructuredLayout(plugin, structuredFolderName);
		if (!result.success) {
			throw new Error(`Migration failed: ${result.error}`);
		}

		// Clean up
		try {
			await app.vault.delete(tempFile);
		} catch (cleanupErr) {
			Logger.warn('Onboarding: Failed to clean up temp file', cleanupErr);
		}
	}

	async function handleExistingStructured() {
		Logger.log('Onboarding: Existing + Structured Setup');
		let absolutePath = existingFilePath;

		// Convert vault-relative to absolute if needed
		if (!absolutePath.match(/^[a-zA-Z]:[\\\/]/) && !absolutePath.startsWith('/')) {
			const file = app.vault.getAbstractFileByPath(absolutePath);
			if (file && file instanceof TFile) {
				// @ts-ignore
				absolutePath = app.vault.adapter.getFullPath(file.path);
			} else {
				throw new Error(`Could not find file in vault: ${absolutePath}`);
			}
		}

		plugin.settings.beancountFilePath = absolutePath;
		plugin.settings.fileOrganization = fileOrganization;
		await plugin.saveSettings();

		const result = await migrateToStructuredLayout(plugin, structuredFolderName);
		if (!result.success) {
			throw new Error(`Migration failed: ${result.error}`);
		}
	}

	function skipOnboarding() {
		new Notice('You can configure commands manually in Settings → Connection');
		modal.close();
	}

	async function finishAndOpenDashboard() {
		// @ts-ignore
		await plugin.activateView(UNIFIED_DASHBOARD_VIEW_TYPE, 'tab');
		modal.close();
	}
</script>

<div class="onboarding-container">
	<!-- Header -->
	<div class="onboarding-header">
		<h2>Welcome to Obsidian Finance</h2>
		<!-- Step Indicator -->
		<div class="step-indicator">
			<div class="step-item" class:is-active={currentStep === 'prerequisites'}>
				<span>🔍 1. Prerequisites</span>
			</div>
			<div class="step-item" class:is-active={currentStep === 'file-setup'}>
				<span>📁 2. File Setup</span>
			</div>
			<div class="step-item" class:is-active={currentStep === 'verification'}>
				<span>✅ 3. Verification</span>
			</div>
		</div>
	</div>

	<!-- Step Content -->
	<div class="onboarding-body">
		{#if currentStep === 'prerequisites'}
			<p class="setting-item-description">
				First, let's verify that your system has the required tools installed to run Beancount.
			</p>

			<!-- Required list -->
			<div class="info-section">
				<h4>📋 Required Software</h4>
				<ul>
					<li>Python 3.8 or higher</li>
					<li>Beancount v3+ (<code>pip install beancount</code>)</li>
					<li>Bean Query (separate package: <code>pip install beanquery</code>)</li>
					<li>Bean Price <em class="text-muted">(optional)</em> — for fetching commodity prices (<code>pip install beanprice</code>)</li>
				</ul>
				<p class="optional-note">
					<strong>Note:</strong> <code>bean-query</code> and <code>bean-price</code> are NOT included automatically with Beancount and require separate pip installations.
				</p>
			</div>

			<!-- Check status -->
			{#if prerequisitesChecked}
				<div class="prereq-status-grid">
					<!-- Python Card -->
					<div class="status-card" class:is-valid={pythonValid} class:is-invalid={!pythonValid}>
						<div class="status-card-header">
							<strong>Python</strong>
							<span>{pythonValid ? '✅' : '❌'}</span>
						</div>
						<div class="status-card-content">
							{#if pythonValid}
								<code>{pythonCommand}</code>
								{#if pythonVersion}<div class="version-info">v{pythonVersion}</div>{/if}
							{:else}
								<span class="error-text">Not found</span>
							{/if}
						</div>
					</div>

					<!-- Bean Query Card -->
					<div class="status-card" class:is-valid={beanQueryValid} class:is-invalid={!beanQueryValid}>
						<div class="status-card-header">
							<strong>Bean Query</strong>
							<span>{beanQueryValid ? '✅' : '❌'}</span>
						</div>
						<div class="status-card-content">
							{#if beanQueryValid}
								<code>{beanQueryCommand}</code>
								{#if beanQueryVersion}<div class="version-info">v{beanQueryVersion}</div>{/if}
							{:else}
								<span class="error-text">Not found</span>
							{/if}
						</div>
					</div>

					<!-- Bean Price Card -->
					<div class="status-card" class:is-valid={beanPriceValid} class:is-optional={!beanPriceValid}>
						<div class="status-card-header">
							<strong>Bean Price</strong>
							<span>{beanPriceValid ? '✅' : '➖ Optional'}</span>
						</div>
						<div class="status-card-content">
							{#if beanPriceValid}
								<code>{beanPriceCommand}</code>
								{#if beanPriceVersion}<div class="version-info">v{beanPriceVersion}</div>{/if}
							{:else}
								<span class="muted-text">Not detected</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Instructions if missing -->
				{#if !pythonValid || !beanQueryValid}
					<div class="info-section help-section">
						<h4>📚 Installation Instructions</h4>
						<div class="platform-instructions">
							{#if platformDisplay.includes('Windows')}
								<p><strong>Windows Native:</strong></p>
								<ol>
									<li>Install Python 3.8+ from <a href="https://www.python.org/downloads/">python.org</a></li>
									<li>Open PowerShell or Command Prompt and run:</li>
									<pre><code>pip install beancount beanquery</code></pre>
									<li>Verify via: <code>bean-query --version</code></li>
								</ol>
								<p><em>WSL note: If you run Obsidian in Windows but want Beancount in WSL, make sure WSL is set up and query tools are installed in WSL.</em></p>
							{:else}
								<p><strong>macOS / Linux:</strong></p>
								<ol>
									<li>Open your terminal</li>
									<li>Run python installer or brew commands:</li>
									<pre><code>pip3 install beancount beanquery</code></pre>
									<li>Verify via: <code>bean-query --version</code></li>
								</ol>
							{/if}
							<p>📖 <a href="https://beancount.github.io/docs/installing_beancount.html" target="_blank">Official Beancount Installation Guide</a></p>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Action Buttons -->
			<div class="action-buttons-row">
				<button class="mod-warning" on:click={skipOnboarding}>Skip (Manual Config)</button>
				
				<div class="main-buttons">
					<button class="mod-cta" on:click={checkPrerequisites} disabled={isCheckingPrereqs}>
						{isCheckingPrereqs ? '⏳ Checking...' : '🔍 Check Prerequisites'}
					</button>

					{#if pythonValid && beanQueryValid}
						<button class="mod-cta next-btn" on:click={() => currentStep = 'file-setup'}>
							Next: File Setup →
						</button>
					{/if}
				</div>
			</div>

		{:else}
			{#if currentStep === 'file-setup'}
				<p class="setting-item-description">
					Choose your starting point. A structured folder layout will be created to organize your finances.
				</p>

				<!-- CARD LAYOUT FOR OPTION SELECTION -->
				<div class="setup-cards-grid">
					<!-- Card A: Demo -->
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="setup-card" class:is-selected={dataChoice === 'demo'} on:click={() => selectDataChoice('demo')}>
						<div class="card-badge">✨ Recommended for Beginners</div>
						<div class="card-icon">📊</div>
						<h4>Start with Demo Data</h4>
						<p>We'll set up a complete sample ledger with realistic accounts and transactions so you can explore the dashboard immediately.</p>
					</div>

					<!-- Card B: Existing -->
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="setup-card" class:is-selected={dataChoice === 'existing'} on:click={() => selectDataChoice('existing')}>
						<div class="card-icon">📁</div>
						<h4>Use My Existing Ledger</h4>
						<p>Select your existing Beancount file to migrate it into structured layout folders under your vault.</p>
					</div>
				</div>

				<!-- Config Form - Native Obsidian setting-item layout -->
				{#if dataChoice}
					<div class="setup-form-container">
						{#if dataChoice === 'existing'}
							<!-- Select Existing Dropdown / Input -->
							<div class="setting-item">
								<div class="setting-item-info">
									<div class="setting-item-name">Select Beancount file</div>
									<div class="setting-item-description">Choose from existing .beancount files in your vault</div>
								</div>
								<div class="setting-item-control">
									{#if beancountFiles.length > 0}
										<select bind:value={existingFilePath}>
											{#each beancountFiles as file}
												<option value={file}>{file}</option>
											{/each}
										</select>
									{:else}
										<span class="muted-text">No .beancount files found in vault. Enter path below.</span>
									{/if}
								</div>
							</div>

							<div class="setting-item">
								<div class="setting-item-info">
									<div class="setting-item-name">Beancount file path</div>
									<div class="setting-item-description">Absolute or vault-relative path to your ledger file</div>
								</div>
								<div class="setting-item-control">
									<input type="text" bind:value={existingFilePath} placeholder="/path/to/your/ledger.beancount" />
								</div>
							</div>
						{/if}

						<!-- Structured Folder Name -->
						<div class="setting-item">
							<div class="setting-item-info">
								<div class="setting-item-name">Structured folder name</div>
								<div class="setting-item-description">Folder in your vault where organised finance files will live</div>
							</div>
							<div class="setting-item-control">
								<input type="text" bind:value={structuredFolderName} placeholder="Finances" />
							</div>
						</div>

						<!-- Transaction File Organization -->
						<div class="setting-item">
							<div class="setting-item-info">
								<div class="setting-item-name">Transaction File Organization</div>
								<div class="setting-item-description">How transactions will be split into sub-files inside your ledger</div>
							</div>
							<div class="setting-item-control">
								<select bind:value={fileOrganization}>
									<option value="yearly">Yearly (e.g. transactions/2026.beancount)</option>
									<option value="monthly">Monthly (e.g. transactions/2026/2026-06.beancount)</option>
								</select>
							</div>
						</div>

						<!-- Operating Currency -->
						<div class="setting-item">
							<div class="setting-item-info">
								<div class="setting-item-name">Operating currency</div>
								<div class="setting-item-description">The primary currency of your financial records</div>
							</div>
							<div class="setting-item-control">
								<input 
									type="text" 
									bind:value={operatingCurrency} 
									placeholder="USD" 
									on:input={() => operatingCurrency = operatingCurrency.toUpperCase()}
								/>
							</div>
						</div>

						{#if dataChoice === 'demo'}
							<p class="currency-demo-hint">
								💡 Demo data uses USD currency. You can adjust settings or currencies later in settings.
							</p>
						{/if}
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="action-buttons-row">
					<button on:click={() => currentStep = 'prerequisites'}>← Back</button>
					<button class="mod-cta" on:click={handleFinish} disabled={isSubmitting || !dataChoice}>
						{isSubmitting ? '⏳ Setting up...' : 'Start Setup'}
					</button>
				</div>

			{:else if currentStep === 'verification'}
				<p class="setting-item-description">
					Beancount for Obsidian is now configured and ready to use!
				</p>

				<!-- SUCCESS SUMMARY SECTION -->
				<div class="success-banner">
					<span class="success-icon">🎉</span>
					<h3>Setup Complete!</h3>
				</div>

				<div class="info-section success-summary-card">
					<h4>Configuration Summary:</h4>
					<ul>
						<li><strong>Python:</strong> {pythonCommand || 'N/A'} ({pythonVersion || 'unknown'})</li>
						<li><strong>Bean Query:</strong> {beanQueryCommand || 'N/A'}</li>
						<li><strong>Bean Price:</strong> {beanPriceValid ? `${beanPriceCommand} (Automatic price fetching available)` : 'Not detected (install beanprice to enable)'}</li>
						<li><strong>File Layout:</strong> Structured Layout (under <code>{structuredFolderName}/</code>)</li>
						<li><strong>Data Source:</strong> {dataChoice === 'demo' ? 'Demo Data' : 'Existing Ledger'}</li>
						<li><strong>Operating Currency:</strong> <span class="text-success">{operatingCurrency}</span></li>
					</ul>
				</div>

				<!-- NEXT STEPS -->
				<div class="info-section">
					<h4>🚀 Next Steps:</h4>
					<ol>
						<li>Open the Finance Dashboard (Command Palette → <strong>"Open Finance Dashboard"</strong>)</li>
						<li>Explore the 5 tabs: Overview, Transactions, Journal, Balance Sheet, Commodities</li>
						<li>Try query writing in Markdown notes with BQL blocks</li>
						{#if beanPriceValid}
							<li>Enable Automatic Price Fetching in Settings → Connection to keep commodity prices up to date</li>
						{/if}
					</ol>
				</div>

				<div class="action-buttons-row centered">
					<button on:click={() => modal.close()}>Close</button>
					<button class="mod-cta" on:click={finishAndOpenDashboard}>Open Dashboard & Close</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.onboarding-container {
		padding: var(--size-4-4);
		max-width: 680px;
		margin: 0 auto;
	}

	.onboarding-header h2 {
		margin: 0;
		color: var(--text-normal);
		font-size: var(--font-ui-large);
		text-align: center;
	}

	/* Steps indicator */
	.step-indicator {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-3);
		margin-top: var(--size-4-4);
		margin-bottom: var(--size-4-4);
	}

	.step-item {
		flex: 1;
		text-align: center;
		padding: var(--size-4-2) var(--size-4-1);
		border-radius: var(--radius-m);
		font-size: var(--font-ui-small);
		background-color: var(--background-secondary-alt);
		color: var(--text-muted);
		border: 1px solid var(--background-modifier-border);
		transition: all 0.2s ease-in-out;
	}

	.step-item.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
		font-weight: bold;
		border-color: var(--interactive-accent-hover);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* General Section Box */
	.info-section {
		background-color: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		padding: var(--size-4-4);
		margin-bottom: var(--size-4-4);
	}

	.info-section h4 {
		margin: 0 0 var(--size-4-2) 0;
		font-size: var(--font-ui-medium);
		color: var(--text-normal);
	}

	.info-section ul, .info-section ol {
		margin: var(--size-4-2) 0;
		padding-left: var(--size-4-5);
		font-size: var(--font-ui-small);
		line-height: var(--line-height-normal);
	}

	.info-section li {
		margin-bottom: var(--size-4-1);
	}

	.optional-note {
		margin-top: var(--size-4-2);
		font-size: var(--font-ui-smaller);
		color: var(--text-muted);
	}

	/* Status Grid cards */
	.prereq-status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--size-4-3);
		margin-bottom: var(--size-4-4);
	}

	.status-card {
		background-color: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		padding: var(--size-4-3);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--size-4-2);
		transition: transform 0.2s, border-color 0.2s;
	}

	.status-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-ui-small);
	}

	.status-card-content {
		font-size: var(--font-ui-smaller);
	}

	.status-card code {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 10px;
		background: var(--background-primary);
		padding: 2px 4px;
		border-radius: var(--radius-s);
		margin-bottom: 4px;
	}

	.status-card .version-info {
		color: var(--text-success);
		font-weight: 600;
	}

	/* Card status borders */
	.status-card.is-valid {
		border-left: 3px solid var(--text-success);
	}

	.status-card.is-invalid {
		border-left: 3px solid var(--text-error);
	}

	.status-card.is-optional {
		border-left: 3px solid var(--text-muted);
	}

	.error-text {
		color: var(--text-error);
	}

	.muted-text {
		color: var(--text-muted);
	}

	/* Instructions block */
	pre {
		background: var(--background-primary);
		padding: var(--size-4-2);
		border-radius: var(--radius-s);
		border: 1px solid var(--background-modifier-border);
		font-size: 11px;
		overflow-x: auto;
	}

	/* Card Options layout for Step 2 */
	.setup-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--size-4-4);
		margin-bottom: var(--size-4-4);
	}

	.setup-card {
		background-color: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-l);
		padding: var(--size-4-4);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		transition: all 0.2s ease-in-out;
	}

	.setup-card:hover {
		border-color: var(--interactive-accent);
		transform: translateY(-2px);
		background-color: var(--background-secondary-alt);
	}

	.setup-card.is-selected {
		border-color: var(--interactive-accent);
		background-color: rgba(var(--color-accent-rgb), 0.05);
		box-shadow: 0 0 0 2px var(--interactive-accent);
	}

	.card-badge {
		position: absolute;
		top: -10px;
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
		font-size: 9px;
		font-weight: bold;
		padding: 2px 6px;
		border-radius: 10px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
	}

	.card-icon {
		font-size: 32px;
		margin-bottom: var(--size-4-2);
	}

	.setup-card h4 {
		margin: 0 0 var(--size-4-1) 0;
		color: var(--text-normal);
		font-size: var(--font-ui-medium);
	}

	.setup-card p {
		margin: 0;
		font-size: var(--font-ui-smaller);
		color: var(--text-muted);
		line-height: var(--line-height-normal);
	}

	/* Setup Form styles */
	.setup-form-container {
		background-color: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		padding: var(--size-4-4);
		margin-bottom: var(--size-4-4);
	}

	.currency-demo-hint {
		margin: var(--size-4-2) 0 0 0;
		font-size: var(--font-ui-smaller);
		color: var(--text-muted);
		font-style: italic;
	}

	/* Action Buttons styling */
	.action-buttons-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--size-4-4);
	}

	.action-buttons-row.centered {
		justify-content: center;
		gap: var(--size-4-3);
	}

	.main-buttons {
		display: flex;
		gap: var(--size-4-2);
	}

	/* Verification Step Success banner */
	.success-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--size-4-2);
		margin-bottom: var(--size-4-4);
		color: var(--text-success);
	}

	.success-banner h3 {
		margin: 0;
		font-size: var(--font-ui-large);
		color: var(--text-success);
	}

	.success-icon {
		font-size: 28px;
	}

	.success-summary-card {
		border-left: 4px solid var(--text-success);
	}

	.text-success {
		color: var(--text-success);
		font-weight: 600;
	}

	/* Input controls override to feel polished */
	input[type='text'], select {
		width: 100%;
		max-width: 220px;
		background-color: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-s);
		padding: 4px 8px;
		color: var(--text-normal);
	}

	input[type='text']:focus, select:focus {
		border-color: var(--interactive-accent);
		outline: none;
	}

	/* Setting items style tweaks */
	.setting-item {
		border-top: none;
		border-bottom: 1px solid var(--background-modifier-border);
		padding: var(--size-4-3) 0;
	}

	.setting-item:last-child {
		border-bottom: none;
	}

	.setting-item-name {
		font-weight: 500;
	}
</style>
