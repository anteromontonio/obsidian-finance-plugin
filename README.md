# Beancount Ledger

#### Caution
- Recent release 1.4.0 has breaking changes for Beta testers (BRAT). I had to change the plugin name and id to make sure obsidian allows submission to community store. This does not work well with BRAT users. If you are using this plugin via BRAT, please reinstall it from BRAT settings. This will not affect existing beancount files.
- The plugin is now available in community store at `https://community.obsidian.md/plugins/beancount-finance`

-------------------------------------------------

![Plugin Logo](docs/assets/Primary_horizontal_logo.png)

A comprehensive Beancount integration for [Obsidian](https://obsidian.md) that transforms your vault into a powerful plain-text accounting dashboard.

📘 **[Full Documentation](https://mkshp-dev.github.io/obsidian-finance-plugin/)** - Read the complete guide for features, configuration, and usage.

---

## ✨ Key Features

![Unified Dashboard](docs/assets/overview.png)
<p align="center"><em>📊 Unified Dashboard - Net worth tracking, balance sheets, and interactive charts in one view</em></p>

<details>
<summary><strong>🔍 Live BQL Queries</strong> - Click to see</summary>
<br/>
<img src="docs/assets/bql-query.png" alt="BQL Queries"/>
<p align="center"><em>Embed dynamic financial data directly in your notes using named query directives</em></p>
</details>

<details>
<summary><strong>⚡ Smart Transaction Entry</strong> - Click to see</summary>
<br/>
<img src="docs/assets/adding-transaction.png" alt="Transactions"/>
<p align="center"><em>Quick transaction creation with account autocomplete and validation</em></p>
</details>

**Highlights:**
- 📈 Real-time financial metrics and trend visualization
- 📝 Inline BQL queries with named query directives (`bql-q:name`)
- 💰 Complete transaction, balance, and commodity management
- 💹 **Automated Price Fetching** — runs `bean-price` on a schedule; new prices are deduplicated and appended to `prices.beancount` automatically
- 🔄 Vault-local Beancount file integration — no separate database

---

## 🔧 Requirements

This plugin integrates with your existing Beancount setup:

1. **Python 3.8+**
2. **Beancount v3+**: Install via `pip install beancount`
3. **bean-query**: Command-line tool for querying Beancount files (`pip install beanquery`)
4. **bean-price** *(optional)*: For automatic commodity price fetching (`pip install beanprice`)
5. **WSL Support** *(optional)*: Full compatibility for Windows users running Beancount in WSL

> **Note:** `bean-query` and `bean-price` are separate packages from Beancount itself and require their own `pip install` commands.

---

## 📦 Installation

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/mkshp-dev/obsidian-finance-plugin/releases)
2. Extract files to `<vault>/.obsidian/plugins/obsidian-finance-plugin/`
3. Enable the plugin in Obsidian Settings → Community Plugins

### BRAT Beta Installation

For beta testers who want to try the latest development version:

1. **Install BRAT Plugin**: 
   - Install [BRAT (Beta Reviewers Auto-update Tester)](https://github.com/TfTHacker/obsidian42-brat) from Obsidian Community Plugins
   - Enable BRAT in your Community Plugins settings

2. **Add Beta Plugin**:
   - Open Command Palette (`Ctrl/Cmd + P`)
   - Run: "BRAT: Add a beta plugin for testing"
   - Enter repository: `mkshp-dev/obsidian-finance-plugin`
   - Select branch: `dev` (or `master` for stable)

3. **Enable Plugin**:
   - Go to Settings → Community Plugins
   - Find "Beancount Ledger" and enable it

BRAT will automatically check for updates and notify you of new versions. This is the recommended way to test beta features before official releases.

**Note**: Beta versions may have bugs. Always keep backups of your Beancount files and vault data.

---

## 🔒 Permissions & Privacy

Beancount Ledger is a local-first plugin. It does not send ledger data, account names, query results, or prices to a project server.

| Access | Current use | Direction |
|---|---|---|
| Vault file access | Reads/writes Beancount files stored inside the current Obsidian vault, including generated `prices.beancount` output. | Preferred path. New file I/O should use the Obsidian Vault API. |
| Filesystem access (`fs`) | Legacy helpers may still exist for migration, backups, path conversion, or older outside-vault setups. | Being reduced. Users should keep ledger files inside the vault for community-plugin compatibility. |
| Shell execution (`child_process`) | Runs local Beancount tools such as `bean-query`, `bean-check`, and `bean-price`. | Required to run the local Python packages (`beancount`, `beanquery`, `beanprice`). These CLI commands are executed safely via parameterized `spawn` calls bypassing the shell, and all user input is strictly whitelisted and sanitized to eliminate shell injection vulnerabilities. |
| Vault enumeration | Finds configured BQL/template files in the vault. | Required for plugin features. |
| Clipboard access | Copies query results or transaction text when the user clicks a copy action. | User-initiated only. |

### Vault-only ledger recommendation

For the Obsidian community plugin review path, keep your main ledger and included Beancount files inside the current vault. If your ledger currently lives outside the vault, move it into the vault and update plugin settings to point to the vault-local file. Future releases will prefer vault-local file access and may remove support for direct writes outside the vault.

### Security and Command Execution

Beancount is a Python library with no native JavaScript/WebAssembly counterpart. Therefore, to compute balances, render interactive charts, validate ledger files, and fetch prices, this plugin must interface with your local Python installation via `child_process.spawn`.

To ensure maximum security and privacy:
- **No shell parsing:** Commands are executed directly as process spawns without spawning shell instances (`shell: false`), which prevents shell-injection exploits.
- **Strict Parameterization:** Query strings, file paths, and options are passed as raw array parameters to the executable and are never parsed as part of a shell command line.
- **Input Sanitization:** User-configured parameters (such as price metadata sources) are whitelisted and sanitized using strict regular expressions before being processed.
- **Zero Remote Access:** All operations execute completely locally on your machine.

---

## 🤝 Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mkshp-dev/obsidian-finance-plugin.git
cd obsidian-finance-plugin

# Install dependencies
npm install

# Start development build
npm run dev

# Build for production
npm run build
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support
If this project helps your workflow, consider supporting its development with a ☕

<a href="https://www.buymeacoffee.com/mkshp" target="_blank">
  <img
    src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=mkshp&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00"
    alt="Buy me a coffee"
    height="45"
  />
</a>

<br/>

<a href="https://github.com/sponsors/mkshp-dev" target="_blank">
  <img
    src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github-sponsors&style=flat-square"
    alt="Sponsor mkshp-dev on GitHub"
    height="32"
  />
</a>
