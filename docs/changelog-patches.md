# Changelog

A minimal, safe patch manager for the Google Antigravity VS Code extension (`extension.js`).

Community hotfixes and upstream resolution tracking for installed Antigravity releases.

## IDE Extension Patches

VS Code

[Extension docs→](https://antigravity.google/docs/ide/extensions/vscode)

---

## [v1.9.0] - 2026-10-21

### Compatibility update and syntax synchronization for Extension v1.9.0

Audited companion hotfixes against Google Antigravity Extension v1.9.0. Both `terminal_view` and `binary_file_preview` remain necessary as upstream has not resolved the underlying behaviors; their replacement targets were updated for upstream Closure compiler identifier drift and verified fully compatible.

### Active Hotfixes
- **Enable Standalone Terminal for Background Tasks (`terminal_view`)**:
  - Code drift update: updated import alias (`l` → `n`) across `showTerminal` and the `TerminalPanelProvider` editor webview fallback.
  - Verified compatible with Extension v1.9.0; continues providing the editor tab fallback for live background task streams where `jetski.terminalView` remains undeclared in VS Code contributes.

- **Enable Preview for Binary Files and Images (`binary_file_preview`)**:
  - Code drift update: updated URI and namespace identifiers (`l` → `n`, `w` → `v`) in the `openFile` error-handling wrapper.
  - Verified compatible with Extension v1.9.0; continues falling back to `vscode.open` so images, media, and binary files preview without error toasts.

---

## [v1.8.0] - 2026-10-14

### Compatibility update and retirement of auto_open_priority for Extension v1.8.0

Audited companion hotfixes against Google Antigravity Extension v1.8.0. Upstream transitioned its build pipeline from unbundled TypeScript chunks (`k8-fastbuild`) to whole-program minification (`k8-opt`). The `auto_open_priority` hotfix has been retired and removed from the active registry, while `terminal_view` and `binary_file_preview` were updated for the minified bundle syntax and remain active.

### Active Hotfixes
- **Enable Standalone Terminal for Background Tasks (`terminal_view`)**:
  - Code drift update: adapted patch syntax for `TerminalPanelProvider` and its caller in `extension_bin.js`.
  - Retains the editor tab (`vscode.window.createWebviewPanel`) fallback for background task terminal streams in standard VS Code where `jetski.terminalView` remains undeclared in package contributes.

- **Enable Preview for Binary Files and Images (`binary_file_preview`)**:
  - Code drift update: adapted the `openFile` error-handling fallback in `extension_bin.js`.
  - Catches `openTextDocument` binary asset errors and delegates to `vscode.open` so images and non-text files open cleanly without error notifications.

### Removed
- **Prioritize Auto-Open on Agent Edits (`auto_open_priority`)**:
  - **Retired and removed in Extension v1.8.0**: Removed from the active patch registry. While technically possible to force `autoOpenFiles` precedence over internal `skipOpen` flags, automatically popping open tabs for every file edited during multi-file agent runs creates disruptive tab clutter and editor churn without offering real workflow utility. Navigating to modified files on demand via chat pills or the review diff panel provides a much cleaner, distraction-free experience.

---

## [v1.7.0] - 2026-10-05

### Compatibility update and upstream retirement for Extension v1.7.0

Audited all companion hotfixes against Google Antigravity Extension v1.7.0 release. The `line_counts` hotfix is now resolved upstream by Google and retired, while `auto_open_priority` has been updated with `keepOpen` support and remains active.

### Active Hotfixes
- **Prioritize Auto-Open on Agent Edits (`auto_open_priority`)**:
  - Updated replacement pattern to accommodate upstream's new `keepOpen` argument in `getOpenOptions`, ensuring files open cleanly while preserving `autoOpenFiles` precedence over `skipOpen`.

- **Enable Standalone Terminal for Background Tasks (`terminal_view`)**:
  - Resolves an issue where clicking running background task cards in the chat UI fails to display terminal output due to `jetski.terminalView` lacking a bottom panel declaration in standard VS Code.
  - Adds an editor tab (`vscode.window.createWebviewPanel`) fallback that renders the live interactive terminal stream beside the active chat.
  - *Note:* Streams active running background tasks in real time. Historical finished tasks in the side panel render blank due to an upstream frontend limitation where `stepIndex` is omitted upon task completion.

- **Enable Preview for Binary Files and Images (`binary_file_preview`)**:
  - Resolves an issue where clicking viewed images, media, or binary file pills in chat throws `"cannot open ... File seems to be binary and cannot be opened as text"`.
  - Catches `openTextDocument` rejections for non-text assets and falls back to VS Code's universal editor command (`vscode.open`), opening images in VS Code's native Image Viewer tab and delegating other formats to custom editor extensions.

### Resolved Upstream
- **Accurate Side-by-Side Line Counts (`line_counts`)**:
  - **Resolved in Extension v1.7.0**: Google natively resolved the `+0 -0` bug in Extension v1.7.0 by introducing `countDiffLines` using `getDiffHunks` in `agent_edit_manager.ts` and activating `openSideBySideDiffs: true`.
  - This hotfix is no longer needed and has been retired from the active patch registry.

---

## [v1.6.0] - 2026-09-30

### Accurate side-by-side line counts and prioritized file reveal

Hotfixes for Google Antigravity Extension v1.6.0 restoring accurate diff metrics in side-by-side mode and prioritizing file reveal preferences during agent edits.

### Fixes
- **Accurate Side-by-Side Line Counts (`line_counts`)**:
  - Resolves an issue where diff indicators in chat display `+0 -0` when inline diff mode is disabled.
  - Parses unified diff hunks via Antigravity's internal diff engine to compute accurate `+N -M` line additions and deletions.

- **Prioritize Auto-Open on Agent Edits (`auto_open_priority`)**:
  - Resolves an issue where modified files fail to automatically reveal in the editor when `antigravity.autoOpenFiles` is enabled.
  - Prioritizes user workspace preferences over the internal `skipOpen` event flag during agent turns.
