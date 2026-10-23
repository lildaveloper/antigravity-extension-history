# Antigravity Extension Patch Registry & Upstream Lifecycle

This document serves as the technical rationale and upstream lifecycle tracker for all patches in this repository.

The goal of this project is to maintain hotfixes for known issues in the Google Antigravity VS Code extension (`google.google-antigravity`) while tracking upstream releases. When Google resolves an issue upstream, or when a patch is deprecated/retired, the corresponding patch is archived.

---

## Upstream Status Matrix

| Patch ID | Name | Upstream Status | Target Scope | Verified Version |
| :--- | :--- | :--- | :--- | :--- |
| `terminal_view` | Enable Standalone Terminal for Background Tasks | Active | Webview panel fallback for background task terminal UI | v1.9.0 |
| `binary_file_preview` | Enable Preview for Binary Files and Images | Active | Universal editor fallback for binary assets in openFile | v1.9.0 |
| `auto_open_priority` | Prioritize autoOpenFiles over skipOpen | Retired / Removed (v1.8.0) | File reveal logic on agent edit events | v1.8.0 |
| `line_counts` | Accurate Side-by-Side Line Counts | Resolved Upstream (Retired in v1.7.0) | Diff hunk line count calculation in side-by-side mode | v1.7.0 |

---

## Active Patches

### 1. `terminal_view` - Enable Standalone Terminal for Background Tasks

* **Patch File:** [`patches/terminal_view.js`](patches/terminal_view.js)
* **Status:** Active (Not resolved upstream)
* **Target Version:** v1.9.0 (Verified)

#### Problem Statement
When a user launches background tasks (such as long-running build commands, watchers, or tests) during an Antigravity agent session, clicking the interactive task card in the chat UI fails to open the terminal stream. The user is unable to view real-time compilation logs, compiler warnings, or execution progress inside VS Code.

#### Root Cause Analysis
In `extension.js`, Google instantiates and registers a `TerminalPanelProvider` for `jetski.terminalView` as a `WebviewViewProvider` meant for Cider's bottom panel. However, `jetski.terminalView` is not declared as a view container in VS Code's `package.json`. Consequently, `resolveWebviewView` is never called by VS Code, leaving `this.view` permanently `undefined`. When `showTerminal(request)` runs, the existing logic checks `if (this.view)` and silently does nothing when `this.view` is absent, while `openTerminal(request)` attempts to focus a non-existent view (`jetski.terminalView.focus`).

#### Fix Mechanism
1. Guard `jetski.terminalView.focus` in `openTerminal` so it only executes when `this.terminalPanelProvider.view` exists.
2. In `TerminalPanelProvider.showTerminal(request)`, provide an editor tab fallback: when `this.view` is `undefined`, dynamically create or reveal a `vscode.window.createWebviewPanel('jetski.terminalPanel', 'Antigravity Terminal', vscode.ViewColumn.Beside, ...)` and delegate rendering via `this.renderer.renderJetskiIframe(this.panel, { targetRoute: 'terminal-standalone', extraParams, type: 'terminal', location: 'editor' })`.

#### Upstream Retirement Criteria
Google either declares `jetski.terminalView` under `contributes.views.panel` in `package.json` or provides an upstream editor tab fallback for standard VS Code environments.

#### Scope & Known Limitations
> [!NOTE]
> This patch enables live terminal output for **currently running** background tasks. Clicking older background tasks in the side panel that have already completed or stopped currently renders a blank tab, because Google's webview UI omits `stepIndex` when archiving finished tasks to `accumulatedSections`.

---

### 2. `binary_file_preview` - Enable Preview for Binary Files and Images

* **Patch File:** [`patches/binary_file_preview.js`](patches/binary_file_preview.js)
* **Status:** Active (Not resolved upstream)
* **Target Version:** v1.9.0 (Verified)

#### Problem Statement
When an agent inspects images, media, or other non-text files during a session, clicking the file pill or preview button in the chat interface throws an error toast:
> `Unable to open file:///...: cannot open file:///... Detail: File seems to be binary and cannot be opened as text`

#### Root Cause Analysis
In `ExtensionApi.openFile(request)`, all incoming file links are opened strictly via `vscode.workspace.openTextDocument(targetUri)`. VS Code's text buffer engine rejects binary assets (e.g. PNG headers or null bytes), throwing an unhandled rejection that gets displayed as an error notification instead of opening in an appropriate editor tab.

#### Fix Mechanism
When `vscode.workspace.openTextDocument` rejects a binary or non-text file, the patch catches the failure and delegates to VS Code's universal editor command:
```javascript
await vscode.commands.executeCommand('vscode.open', uri, { preview: true });
```
This lets VS Code's native editor resolver open images in its built-in tabbed Image Viewer, or delegate to user-configured custom editors (such as PDF viewers, audio players, or hex inspectors) without throwing an error toast.

#### Upstream Retirement Criteria
Google updates `openFile` upstream to detect non-text/binary files and use `vscode.open` or VS Code's editor resolver rather than assuming all clicked files are text buffers.

---

## Retired & Resolved Patches (Archive)

### 1. `line_counts` - Accurate Side-by-Side Line Counts

* **Patch File:** [`patches/line_counts.js`](patches/line_counts.js)
* **Status:** Resolved Upstream (Retired in v1.7.0)
* **Retired In:** Extension v1.7.0

#### Upstream Resolution
In Extension v1.7.0, Google resolved this issue natively by introducing `countDiffLines` in `agent_edit_manager.ts`, using Antigravity's internal diff engine (`getDiffHunks`) to parse unified diff hunks and count inserted and deleted lines, paired with `openSideBySideDiffs: true`. This hotfix is no longer needed and has been retired.

#### Original Problem Statement
When `antigravity.enableInlineDiff` was set to `false`, the diff indicator in the chat UI frequently displayed `+0 -0` for modified files, even when dozens of lines had been added or removed, due to naive length subtraction (`modifiedLines.length - originalLines.length`).

---

### 2. `auto_open_priority` - Prioritize autoOpenFiles over skipOpen

* **Patch File:** [`patches/auto_open_priority.js`](patches/auto_open_priority.js) (Archived)
* **Status:** Retired / Removed in v1.8.0
* **Retired In:** Extension v1.8.0

#### Rationale for Removal
While technically feasible to enforce `autoOpenFiles` precedence over the agent's internal `skipOpen` flag, automatically opening and focusing editor tabs for every file edited during multi-file agent runs creates disruptive window churn and tab clutter without providing substantial workflow utility. Navigating to modified files on demand via chat pills or the review diff interface offers a significantly cleaner, distraction-free experience.

#### Original Problem Statement
Users who configured `"antigravity.autoOpenFiles": true` expected files modified by the AI agent to open automatically in the editor for review. However, agent edit stream events frequently send `skipOpen: true`, which unconditionally suppressed the auto-open behavior and kept modified files hidden in the background.

---

## Upstream Lifecycle & Retirement Workflow

When a new version of the Antigravity extension is released:
1. **Verification:** Inspect whether Google fixed any of the issues in their upstream bundle (using `packages/extension-history/` diffs or the `/audit-patches` skill).
2. **Retirement:** If an issue is resolved upstream or retired:
   - Mark the patch status in the matrix above.
   - Remove the patch module from [`patches/index.js`](patches/index.js).
   - Move the patch entry to the archive section.

---

## Contributing a Patch

1. Verify the issue is reproducible on the latest official version of the Google Antigravity extension.
2. Follow the declarative patch format outlined in [`README.md`](README.md#adding-a-new-patch-zero-boilerplate).
3. Ensure every patch includes safe pattern matching, idempotency, and passes syntax validation via `node --check`.
