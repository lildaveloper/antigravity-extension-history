# Changelog

Track new features, improvements, and bug fixes across Google Antigravity VS Code Extension releases.

New versions roll out gradually and may take a few days to reach all users.

## IDE Extensions

VS Code

[Extension docs→](https://antigravity.google/docs/ide/extensions/vscode)

---

## [v1.9.0] - 2026-10-21

### Focused hunk review shortcuts, self-healing backend recovery, and liveness heartbeats
Review inline diff hunks directly from your keyboard with cursor-focused accept and reject shortcuts, while automatic backend recovery and health heartbeats keep your language server self-healing. This release also introduces sleep-drift detection, centralized telemetry governance, and 150+ interactive elicitation and tool schemas.

### Highlights
- **Cursor-Focused Diff Hunk Keyboard Navigation (`alt+enter` / `alt+shift+enter`)**: Streamlined keyboard-driven code review workflows with granular, cursor-targeted diff hunk resolution:
  - **Focused Hunk Targeting (`acceptFocusedHunk` / `rejectFocusedHunk`)**: Added dedicated commands (`antigravity.inlineDiff.acceptFocusedHunk` and `antigravity.inlineDiff.rejectFocusedHunk`) that dynamically resolve only the single diff hunk containing the active editor cursor line (`selection.active.line`), falling back to the first pending hunk if the cursor is outside active diff zones.
  - **Inline Diff Shortcuts**: Bound `alt+enter` to accept the focused hunk and `alt+shift+enter` to reject the focused hunk whenever an inline diff review is active (`editorTextFocus && !editorReadonly && antigravity.hasActiveDiff && !findWidgetVisible`).
  - **Side-by-Side Review Parity**: Added matching `antigravity.sideBySide.acceptAll` (`alt+enter`) and `antigravity.sideBySide.rejectAll` (`alt+shift+enter`) bindings when reviewing full-file side-by-side diffs.
  - **Collision Prevention**: Scoped `antigravity.toggleChatFocus` (`!editorTextFocus && !terminalFocus`) and `antigravity.dynamic.acceptAgentStep` (`!editorTextFocus`) to prevent hotkey conflicts while typing in the active editor buffer.

- **Automatic Backend Recovery with Bounded Backoff (`antigravity.autoRecover`)**: Introduced self-healing process resilience for the local Antigravity daemon (`agy --hub`):
  - **Automated Restarts**: When enabled, the extension automatically restarts the backend language server if it crashes or terminates unexpectedly mid-session without requiring a manual window reload.
  - **Bounded Exponential Backoff**: Restarts use escalating backoff intervals (`1000ms`, `3000ms`, `9000ms`) with ±20% randomized jitter, enforcing a maximum budget of 3 recovery attempts within any 10-minute sliding window (`AUTO_RECOVER_WINDOW_MS = 600,000ms`).
  - **Graceful Failure State**: If the restart budget is exhausted, the server manager stops recovery attempts, logs `SERVER_AUTO_RECOVERY_FAILED` telemetry, and surfaces an error card in the chat view with a manual retry action. Can be globally bypassed with the `ANTIGRAVITY_DISABLE_AUTO_RECOVER=1` environment variable.

- **Liveness Probing & System Sleep-Drift Safeguards (`antigravity.heartbeatIntervalMs`)**: Added continuous health monitoring to detect hung daemon instances and prevent false alarms across system sleep cycles:
  - **Active `/healthz` Heartbeat**: Probes the backend health endpoint on a configurable interval (`default: 15000ms`, `min: 1000ms`). Inactivity is automatically throttled by 4x (`60000ms`) when the VS Code window loses focus.
  - **Hang Detection**: Tripping 3 consecutive missed probes (`HEARTBEAT_MISS_THRESHOLD = 3`) marks the backend as hung, logging `SERVER_HANG` and automatically triggering recovery when `autoRecover` is enabled.
  - **Monotonic Sleep-Drift Detection**: Detects clock discrepancies between wall time and monotonic process uptime (`SUSPEND_DRIFT_THRESHOLD_MS = 15000ms`). Probes missed during macOS or Linux sleep/suspend transitions are recognized as sleep events and ignored rather than treated as backend failures.
  - **Instance ID Tracking**: Inspects backend `instanceId` during health probes, firing `SERVER_INSTANCE_CHANGED` and alerting the webview if the server daemon process was replaced or restarted out-of-band.

- **Centralized Telemetry Migration (`antigravity.openTelemetrySettings`)**: Modernized telemetry configuration by migrating controls from workspace JSON settings to the centralized Antigravity Account settings interface:
  - **Settings Deprecation**: Deprecated `antigravity.enableTelemetry` in `package.json` with a direct command pointer (`command:antigravity.openTelemetrySettings`) to the new data-sharing UI.
  - **One-Time Migration Notice**: Detects legacy configuration in user or workspace `settings.json` and displays an informational prompt explaining that telemetry is now managed under Settings → Account, while honoring existing `false` opt-outs.

### Improvements
- **Interactive Elicitation Protocols**:
  - Added rich user interaction schemas in `bridge.js` enabling multi-turn agent clarifications: `ConfirmationRequestSchema`, `ConfirmationResponseSchema`, `MultipleChoiceRequestSchema`, `MultipleChoiceResponseSchema`, `MultiQuestionRequestSchema`, `MultiQuestionResponseSchema`, `ElicitationQuestionSchema`, `ElicitationChoiceSchema`, `UserTimeoutSchema`, and `UserSkippedSchema`.

- **First-Class Agent Tool Pipeline**:
  - Registered 150+ protobuf schemas in `bridge.js` defining native tool definitions and trajectory execution steps: `FilesystemToolSchema`, `BashToolSchema`, `ManageTaskToolSchema`, `ScheduleToolSchema`, `ComputerUseSchema`, `GoogleMapsSchema`, `FileSearchSchema`, `UrlContextSchema`, and `CodeExecutionSchema`.
  - Added dedicated call and result step schemas for file operations (`FindFileCallStep`, `ListDirectoryCallStep`, `SearchDirectoryCallStep`, `ViewFileCallStep`, `EditFileCallStep`), image generation (`GenerateImageCallStep`), and skill discovery (`SkillLookupCallStep`).

- **Conversation Search & Chapters**:
  - Added `SearchConversationsRequestSchema`, `SearchConversationsResponseSchema`, and `TriggerConversationSearchRequestSchema` for webview-to-host conversation indexing.
  - Introduced `MatchSource` enum (`UNSPECIFIED = 0`, `TITLE = 1`, `USER = 2`, `AGENT = 3`, `WORKSPACE = 4`) and `ConversationChaptersSchema` for organizing conversation trajectories into structured chapters.

- **Enterprise & Cloud Retrieval Configurations**:
  - Added RAG and search configuration schemas: `RagStoreConfigSchema`, `VertexAISearchConfigSchema`, `ExaAISearchConfigSchema`, and `ParallelAISearchConfigSchema`.

- **Security & Secret Scanner Exclusions**:
  - Added `secret-detector:ignore` annotations to bundled third-party dependencies (`gaxios`, `whatwg_url`) and internal OAuth token extraction routines.

### Fixes
- **False-Positive Hang Restarts After Laptop Lid Close**: Fixed an issue where closing and opening a laptop lid or suspending the OS triggered premature server crash notifications by comparing wall-clock drift with process uptime before recording missed heartbeats.

- **Keybinding Interception in Editor & Terminal**: Resolved shortcut collisions where global chat toggle or agent step keybindings captured `alt+enter` or `cmd+l` while typing in the active editor buffer or terminal.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `server_manager.ts`:
    - Added `autoRecover` configuration handling (`AUTO_RECOVER_CONFIG_KEY`, `DISABLE_AUTO_RECOVER_ENV`, `AUTO_RECOVER_MAX_ATTEMPTS = 3`, `AUTO_RECOVER_WINDOW_MS = 600000ms`, `AUTO_RECOVER_BACKOFF_MS = [1000, 3000, 9000]`).
    - Added `probeHealth`, `startHeartbeat`, `stopHeartbeat`, `scheduleHeartbeatTick`, `heartbeatTick`, `handleHealthyHeartbeat`, and `handleMissedHeartbeat`.
    - Added `wasSuspendedSince`, `checkHeartbeatSuspendDrift`, and `markSuspendDetected` (`SUSPEND_DRIFT_THRESHOLD_MS = 15000ms`).
    - Added `restart(reason)`, `handleUnexpectedExit`, `scheduleRecovery`, `runRecovery`, and `cancelPendingRecovery`.
    - Added telemetry events: `SERVER_AUTO_RECOVERY_ATTEMPT`, `SERVER_AUTO_RECOVERED`, `SERVER_AUTO_RECOVERY_FAILED`, `SERVER_HANG`, `SERVER_INSTANCE_CHANGED`.
  - `telemetry.ts`:
    - Added `AccountTelemetrySetting`, `inspectLegacyTelemetrySetting`, and `maybeNotifyLegacyTelemetrySetting`.
    - Registered command `antigravity.openTelemetrySettings` opening `TELEMETRY_SETTINGS_SCREEN`.
    - Added `AntigravityMetadataKey`: `SUSPEND_DETECTED`, `RECOVERY_REASON`, `RECOVERY_ATTEMPT`, `BACKOFF_MS`, `HEARTBEAT_MISSES`.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `inline_diff_manager.ts`:
    - Added `getFocusedHunkIndex(uri)`, `acceptFocusedHunk(uri)`, and `rejectFocusedHunk(uri)` resolving hunks by active line intersections (`selection.active.line`).
    - Registered commands `antigravity.inlineDiff.acceptFocusedHunk` and `antigravity.inlineDiff.rejectFocusedHunk`.
  - `side_by_side_diff_zone_renderer.ts`:
    - Added `registerSideBySideReviewActions` with commands `antigravity.sideBySide.acceptAll` and `antigravity.sideBySide.rejectAll`.
    - Added `SIDE_BY_SIDE_REVIEW_PENDING_KEY` context key synchronization across editor tab switches.

- **Protobuf & IPC Schemas (`extension/bridge.js` & `extension/src/blaze-out/`)**:
  - `cortex_pb.ts` & `iframe_messages.ts`:
    - Added elicitation schemas: `ConfirmationRequestSchema`, `ConfirmationResponseSchema`, `MultipleChoiceRequestSchema`, `MultipleChoiceResponseSchema`, `MultiQuestionRequestSchema`, `MultiQuestionResponseSchema`, `ElicitationQuestionSchema`, `ElicitationChoiceSchema`, `UserTimeoutSchema`, `UserSkippedSchema`.
    - Added tool & step schemas: `FilesystemToolSchema`, `BashToolSchema`, `ManageTaskToolSchema`, `ScheduleToolSchema`, `ComputerUseSchema`, `FindFileCallStepSchema`, `EditFileCallStepSchema`, `ViewFileCallStepSchema`, `GenerateImageCallStepSchema`, `SkillLookupCallStepSchema`.
    - Added search schemas: `SearchConversationsRequestSchema`, `SearchConversationsResponseSchema`, `TriggerConversationSearchRequestSchema`, `ConversationSearchResultSchema`, `MatchSourceSchema`.
    - Added chapter schemas: `ConversationChaptersSchema`, `ConversationChapterSchema`, `TurnHeaderSchema`, `CascadeTrajectorySummarySchema`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - Added `TelemetrySettingChangedRequestSchema` and `TelemetrySettingChangedResponseSchema` for real-time webview setting synchronization.
  - Synchronized `MatchSource` enum definition (`UNSPECIFIED`, `TITLE`, `USER`, `AGENT`, `WORKSPACE`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.10.06-3 (mainline @993733428)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.9.0_RC00`
  - `BUILD_HOSTNAME`: `lgbcf19.prod.google.com`

---

## [v1.8.0] - 2026-10-14

### Cumulative multi-turn reviews, disk change watchers, and PII redaction
Reviews can now stay open across conversation turns with cumulative multi-turn diffs, notifying you when older reviews remain open and protecting pending edits against external disk changes. This release also introduces automated diagnostic PII redaction, concurrent user-edit warnings, and MCP App UI entrypoints.

### Highlights
- **Cumulative Multi-Turn Inline Diff Reviews (`antigravity.autoAcceptOnChat: false`)**: Enhanced the review engine so pending edits are no longer accepted on your behalf when sending new chat turns:
  - **Turn Accumulation (`isCumulativeReview`)**: When auto-accept on chat is turned off, active reviews remain open across conversational turns (`b.turnIndex > a.turnIndex`), allowing subsequent edits to accumulate directly onto the existing review without discarding earlier modifications.
  - **Covered Turns Tracking (`coveredTurns`)**: Automatically tracks all conversational turns spanning an active review session, preserving stored hunk decisions and uncommitted snapshots until explicitly resolved.
  - **Stale Review Notifications (`notifyStaleReviews`)**: When conversational turns elapsed exceed the threshold (`ageOutThreshold = 5`), Antigravity surfaces an informative alert (`The review of <file> from an earlier turn is still open.`) with an **"Open review"** action that reveals the document and focuses the active diff zone.

- **External Disk Change Watcher & Review Protection (`watchOutsideChanges`)**: Added proactive filesystem monitoring to protect pending inline diff reviews when files are modified externally:
  - **Filesystem Watcher Integration**: `InlineDiffManager` now initializes a dedicated `vscode.workspace.createFileSystemWatcher("**/*")` listener monitoring on-disk modifications and deletions.
  - **Debounced Change Safety (`scheduleOutsideChangeCheck`)**: Debounces external disk changes (`outsideChangeDelayMs = 1000ms`) during agent idle periods.
  - **Safe Dropping & Dirty Buffer Preservation (`endAfterOutsideChange`)**: If a file is modified externally (e.g. by `git checkout`, formatters, or external build tools), Antigravity drops the pending review cleanly without writing to disk. For dirty buffers, it safely reloads the latest disk content while preserving unsaved modifications, prompting the user with `"Reload from disk"` or `"Save agent version"`.

- **Automated Diagnostic PII Redaction (`feedback_redaction.ts`)**: Built end-to-end credential, path, and sensitive data sanitization for diagnostics and feedback reports:
  - **Secret & Token Stripping**: Automatically masks bearer tokens, session cookies, passwords, and API keys (`access_token`, `refresh_token`, `csrf_token`, `api_key`).
  - **Path & Directory Redaction**: Redacts CLI workspace arguments (`--add-dir`, `--workspace`, `--cwd`, `--project`) and sanitizes developer home directory paths across macOS, Linux, and Windows to `~`.
  - **Network & Email Obfuscation**: Masks email addresses and external/corporate IP addresses while preserving local loopback addresses (`127.*`, `0.0.0.0`) for connection debugging.
  - **Report Deduplication**: Limits automated diagnostic reports to once every 24 hours per extension version, offering a `"Send anyway"` action if manual submission is required.

- **Concurrent User-Edit Overlap Protection**: Integrated 3-way merge conflict detection in `AgentEditManager`. When an incoming agent edit replaces a line the developer recently edited in the active buffer, Antigravity alerts the user (`The agent's change in <file> replaces a line you edited. Reject that change to keep your line.`) so edits are never silently overwritten.

### Improvements
- **Webview Iframe DOM Recycling**:
  - Replaced error-prone `contentWindow.location.reload()` calls in `bridge.js` with DOM template cloning (`<template id="jetski-frame-template">`), cleanly swapping refreshed webview frames without triggering cross-origin or destroyed context exceptions.
  - Added seamless retry animations with opacity transitions when resolving connection timeouts.

- **Protocol & Schema Additions**:
  - `cortex_pb.ts`: Added Model Context Protocol application entrypoints and view schemas (`McpAppEntrypointSchema`, `McpAppEntrypointType`, `McpAppViewSchema`, `McpToolUiMetaSchema`, `McpResourceSchema`, `McpPromptSpecSchema`, `McpOAuthConfigSchema`, `McpServerInfoSchema`, `CnsSandboxMountSchema`).
  - `AgentSurface`: Registered `AgentSurface` enum (`UNSPECIFIED = 0`, `BASELINE = 1`, `CLI = 2`, `HUB = 3`).
  - `Plugins & Workflows`: Added `ListPluginAccountsToolConfigSchema`, `WorkflowsConfigSchema`, `ProfilesConfigSchema`, and `ProfilePathEntrySchema`.
  - `Turns & Summaries`: Added `TurnsUpdateSchema` and `TurnSummarySchema` for streaming turn updates and summaries; added `CascadeNUXSessionSchema`.
  - `security_annotations_pb.ts`: Introduced GenAI security annotation schemas: `PartyBoundary` (`FIRST_PARTY`, `FIRST_PARTY_CALLS_THIRD_PARTY`, `THIRD_PARTY`), `ExternalCommunication` (`EgressCapability`), and `DataSensitivity` (`Confidentiality`, `UndoWindow`, `UndoDifficulty`, `ChangeScope`).

- **Optimized Production Packaging**:
  - Switched the internal Blaze build configuration from unbundled per-module `k8-fastbuild` to production whole-program optimization (`k8-opt`), packaging all Google3 monorepo modules into `extension_bin.js` and reducing overall extension size.

### Fixes
- **Webview Crash on Timeout Retry**: Resolved `DOMException` and destroyed frame execution errors when clicking "Retry" on loading timeout cards by cloning and re-inserting the iframe node.

- **Silent Overwrites of Active Developer Edits**: Fixed an issue where agent turns generated in the background could silently overwrite lines the user was concurrently editing.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `feedback_redaction.ts`:
    - Added `redactPii`, `redactDiagnostics`, and regex matchers for secrets (`qc`, `sc`), workspace flags (`rc`), home directories (`vc`), emails (`tc`), and external IPs (`wc`).
  - `feedback.ts`:
    - Added 24-hour rate limit check and `"Send anyway"` suppression bypass for diagnostic reports.
  - `cde_auth_service.ts`:
    - Synchronized CDE session tokens and cookie refresh intervals.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `agent_edit_manager.ts`:
    - Added `isCumulativeReview`, `coversTurn`, `coveredTurns`, and `shouldKeepOpenReview` for cumulative multi-turn reviews.
    - Added `notifyStaleReviews` alerting when open reviews exceed `ageOutThreshold`.
    - Added `onChatSent` turn counter tracking (`turnsElapsed`).
    - Added user-edit collision detection (`VO`) warning when agent edits overwrite developer-modified lines.
  - `inline_diff_manager.ts`:
    - Added `watchOutsideChanges` option creating `vscode.workspace.createFileSystemWatcher("**/*")`.
    - Added `scheduleOutsideChangeCheck`, `endAfterOutsideChange`, and `notifyOutsideChange`.
    - Added safe reload and dirty buffer resolution (`dropDiff`, `forceReloadFromFile`).

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - `cortex_pb.ts`: Added MCP App schemas (`McpAppEntrypointSchema`, `McpAppViewSchema`, `McpToolUiMetaSchema`, `McpResourceSchema`, `McpPromptSpecSchema`, `McpOAuthConfigSchema`, `McpServerInfoSchema`, `CnsSandboxMountSchema`); added `AgentSurface` enum; added `ListPluginAccountsToolConfigSchema`, `WorkflowsConfigSchema`, `ProfilesConfigSchema`, `ProfilePathEntrySchema`, `TurnsUpdateSchema`, `TurnSummarySchema`, and `CascadeNUXSessionSchema`.
  - `security_annotations_pb.ts`: Added `SecurityAnnotationsSchema`, `PartyBoundary`, `ExternalCommunication_EgressCapability`, and `DataSensitivity_Confidentiality`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `bridge.js`:
    - Implemented `<template id="jetski-frame-template">` DOM cloning for iframe initialization and timeout reload recovery.
    - Updated focus and theme change listeners (`Ro`, `kp`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.10.01-2 (mainline @991109274)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.8.0_RC00`
  - `BUILD_HOSTNAME`: `lor5.prod.google.com`

---

## [v1.7.0] - 2026-10-05

### Overhauled inline diffs, Auto Save safety, side-by-side reviews, and TLS fallback
Inline diffs have been re-engineered to be safe to use alongside VS Code's Auto Save, featuring dynamic deletion masking to prevent disk corruption, non-finalizing auto-saves, and full undo/redo support. This release also introduces dedicated side-by-side diff review tabs with title bar actions, automatic TLS root certificate fallbacks for corporate networks, native Windows desktop notifications, and background CDE gateway authentication.

### Highlights
- **Inline Diff Auto Save Isolation & Deletion Masking**: Re-architected the inline diff engine to eliminate file corruption risks and premature review finalization caused by VS Code's `files.autoSave` (`afterDelay` or `onFocusChange`):
  - **Dynamic Deletion Masking (`hideDeletedLines`)**: When Auto Save is enabled, Antigravity automatically omits staged deletion lines from the active editor buffer, rendering additions and ensuring Auto Save cannot flush red deleted hunk text into files on disk. If Auto Save is off, the full red/green strikethrough diff is displayed.
  - **Non-Finalizing Auto-Saves**: Auto-save events no longer accept or close pending reviews in the background; diff markers and controls remain interactive until you explicitly press `Cmd+S` (manual save) or click Accept/Reject.
  - **Auto Save Advisory (`AutoSaveNotice`)**: Prompts developers when an inline review begins with Auto Save active, offering one-click buttons to turn off Auto Save or switch to side-by-side diffs.

- **Undoable Inline Diff Resolutions (`Ctrl+Z` / `Cmd+Z`)**: Made per-change and whole-file Accept/Reject actions fully reversible via native editor undo/redo keybindings (`antigravity.inlineDiff.undo` / `antigravity.inlineDiff.redo`), restoring pending diff states without corrupting editor buffers.

- **Dedicated Side-by-Side Review Actions**: Added dedicated title bar and context menu commands (`antigravity.sideBySide.acceptAll` and `antigravity.sideBySide.rejectAll`) when reviewing diffs side-by-side (`antigravity.sideBySideReviewPending`), automatically tracking hunk changes and closing review tabs once resolved.

- **Corporate Network & macOS Keychain TLS Fallback**: Implemented `fetchWithRootFallback` in `root_fallback_fetch.ts`, resolving certificate trust failures (`UNABLE_TO_GET_ISSUER_CERT`) caused by cross-signed root CAs in corporate macOS keychains by falling back to Node's default root certificate store.

- **Windows Native Desktop Toast Notifications**: Extended `VscodeNotificationDelegate` to support Windows 10 and 11 via PowerShell WinRT toast notifications (`ToastGeneric`), featuring direct conversation protocol launch URIs, custom app logo badges, and intelligent suppression when the chat panel is active.

- **Cloud Developer Environments (CDE) Native Auth & Background Cookie Refresh**: Added an interactive PTY authentication terminal (`runCdeLoginTerminal`), silent pre-flight credential validation (`checkCdeAuth`), companion extension token synchronization (`onDidChangeHttpAccessToken`), and periodic background session cookie renewal (`CDE_COOKIE_REFRESH_INTERVAL_MS = 30m`).

### Improvements
- **Deferred Diff Renderer Switching**:
  - Implemented `DeferredRendererSwitch` to defer switching between inline and side-by-side diff renderers until all active reviews finish, preventing in-flight reviews from being discarded.
  - Added `keepNewerReviews` option in `SideBySideDiffZoneRenderer` to avoid closing or reverting files if newer turns supersede an existing review.

- **Decorations on Resolved Diffs**:
  - Registered `resolved_diff_decorations` for virtual diff documents (`jetski-diff://`), decorating rejected insertions and deletions with inline annotations (`✗ Rejected`, `✗ Rejected (lines kept)`), strikethroughs, and explanatory hover tooltips.

- **Multi-File Review Tab Management**:
  - Agent turn reviews now open modified files as permanent tabs (`keepOpen: true`) instead of transient preview tabs, preventing tab churn when inspecting multi-file edits.
  - Persisted pending inline review snapshots across window reloads via workspace state key `jetski.pendingInlineEdits`.

- **Enhanced Diagnostic & Error Formatting**:
  - Added recursive error cause inspection (`describeError`), traversing up to 5 levels of nested `error.cause` to unpack undici `TypeError: fetch failed` and surface underlying connection/TLS failure codes.
  - Formatted `AggregateError` instances inline to expose root network causes during Happy Eyeballs socket connection failures.

- **Diagnostic Privacy & Secret Protection**:
  - Stripped developer home directory paths from plain-text feedback issue summaries, retaining full backend paths solely in encrypted diagnostic attachments.
  - Obfuscated Listnr feedback API keys to ensure compliance with Open VSX secret scanner requirements.
  - Injected `extensionVersion` and `backendBinaryVersion` metadata keys directly into Listnr telemetry payloads.

- **Protocol & Schema Additions**:
  - `codeium_common_pb.ts`: Added `MediaResolution` enum (`UNSPECIFIED = 0`, `LOW = 1`, `MEDIUM = 2`, `HIGH = 3`, `ULTRA_HIGH = 4`); added new models: `claude-opus-5-5-thinking` (1374), `barium-b-med-is-p20-tf` (1375), `barium-b-med-is-p50-tf` (1376), `sonnet-5.5-bon-le` (1377), `claude-sonnet-5-5-thinking` (1378), `opus-5.5-high-bon-le` (1380), `gemini-flash-next` (1381), `gemini-flash-next-default` (1382), `fable-5.1-high` (1383), `fable-5.1-internal` (1384), `fable-5.1-low` (1385), `fable-5.1-medium` (1386), `fable-5.1-max` (1387), `fable-5.1-dropdown` (1388), and `barium-b-no-lie-si-tf` (1389).
  - `cortex_pb.ts`: Added `ContribVariantMetadata` schema (`assigned_variant`, `eligible_variants`, `applied_variant`); added `ViewFileToolConfig.enable_open_document` (field 20).
  - `UserSettings`: Added `terminal_placement` (field 48, enum `TerminalPlacement`) and `agent_sound_volume` (field 49, int32).
  - `ConversationGroupConfig`: Added `sort_mode` (field 3, enum `ConversationGroupSortMode`) and `conversation_ids` (field 4, repeated string).
  - `DeploymentConfig` & Provisioning: Added `preserve_memory_mounts` (field 33), `enable_periodic_backup` (field 34), and `vmstorage_config` (field 35, `VmstorageConfig`); added `DeploymentStatusDetail`, `InstanceFailure`, and `X20QuotaUsage` messages; added `vmstorage_config_jspb` schemas (`MountedDirectory`, `VmstorageConfig`, `VolumeClientConfig`, `VolumeCreationConfig`).
  - `Project` & `Resource`: Added `Project.backend_type` (field 14, enum `BackendType`); added `remote_resource` (field 4, `RemoteResource`) in `Resource` oneof.

### Fixes
- **Accurate Side-by-Side Diff Line Counts**: Fixed an issue where the diff indicator in the chat UI and Changes Overview displayed `+0 -0` for modified files in side-by-side mode by introducing `countDiffLines` backed by unified diff hunk parsing (`getDiffHunks`) in `agent_edit_manager.ts`.

- **Auto Save Buffer Disk Corruption**: Resolved an issue where VS Code's background Auto Save wrote staged deletion lines from inline diffs directly to disk by masking deletion ranges dynamically when `files.autoSave` is active.

- **macOS System Keychain Certificate Rejection**: Fixed TLS handshakes failing with `UNABLE_TO_GET_ISSUER_CERT` behind enterprise inspection proxies or corp-managed Macs carrying cross-signed certificates in the System Keychain.

- **Stale Side-by-Side Review Reversions**: Prevented obsolete review closures from overwriting fresh file edits when multiple edits to the same document occur in quick succession.

- **Notification Redundancy**: Avoided spamming desktop toast notifications when the user is actively viewing the target conversation in the Antigravity chat panel.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `root_fallback_fetch.ts`:
    - Added `fetchWithRootFallback`, `findTlsTrustErrorCode`, `TLS_TRUST_ERROR_CODES`, `nodeDefaultCertificates`, and host caching in `fallbackHosts`.
  - `binary_downloader.ts`:
    - Replaced unhandled undici `TypeError: fetch failed` errors with `describeError` cause chain formatter.
    - Integrated `fetchWithRootFallback` for resilient release downloads.
  - `server_manager.ts`:
    - Added `checkCdeAuth` (pre-flight validation check via `AGY_CLI_CDE_AUTH_ACTION=check`).
    - Added `runCdeLoginTerminal` (PTY terminal session via `AGY_CLI_CDE_AUTH_ACTION=login`).
    - Added `abortActiveAuthTerminal` cleanup handler.
  - `cde_auth_service.ts`:
    - Switched environment check from `CLOUD_WORKSTATIONS` to `GOOGLE_CLOUD_WORKSTATIONS`.
    - Added `onDidChangeHttpAccessToken` subscription.
  - `webview_delegate.ts`:
    - Added `startBackgroundCookieRefresh`, `refreshCdeCookie`, and `CDE_COOKIE_REFRESH_INTERVAL_MS` (30m).
    - Injected iframe refresh script for background `credentials: 'include'` token fetch.
  - `auto_save_notice.ts`:
    - Added `AutoSaveNotice` checking `files.autoSave` with persistent global state `antigravity.autoSaveInlineNotice.dismissed`.
  - `deferred_renderer_switch.ts`:
    - Added `DeferredRendererSwitch` tracking `onDidChangeActiveDiffs`.
  - `vscode_notification_delegate.ts`:
    - Implemented `showWindowsNotification` using PowerShell WinRT `Windows.UI.Notifications.ToastNotificationManager`.
    - Added `isConversationVisible` suppression check.
  - `feedback.ts`:
    - Obfuscated `LISTNR_API_KEY` via array reversal (`OBFUSCATED_LISTNR_API_KEY`).
    - Omitted plain-text backend binary paths from user-facing summary strings.
    - Added `extensionVersion` and `backendBinaryVersion` to Listnr data.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `inline_diff_manager.ts`:
    - Added `hideDeletionLines`, `restoreHiddenOriginal`, and `textDocumentOf` for auto-save compatibility.
    - Added `undoInReview`, `replayResolution`, `clearResolutionHistory`, and `updateUndoContext`.
  - `side_by_side_diff_zone_renderer.ts`:
    - Added `keepNewerReviews` option and `renders` tracking map to prevent stale review overwrites.
    - Added `closeReviewTabs(fileUri)` closing open diff tabs cleanly.
  - `side_by_side_review_actions.ts`:
    - Registered `antigravity.sideBySide.acceptAll` and `antigravity.sideBySide.rejectAll` commands.
  - `resolved_diff_decorations.ts`:
    - Added `registerResolvedDiffDecorations` rendering `✗ Rejected` badges and strikethrough styling for `jetski-diff://` virtual schemes.
  - `agent_edit_manager.ts`:
    - Added `keepOpen` flag to `AddAgentEditMessage`.
    - Added `undoableUserResolutions`, `openSideBySideDiffs`, and `readOnlyNavigationWithoutOpenReview` options.
    - Added snapshotting of pending reviews to `PENDING_INLINE_EDITS_KEY`.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - `codeium_common_pb.ts`: Added `MediaResolution` enum; registered model enum placeholders 1374 through 1389.
  - `cortex_pb.ts`: Added `ContribVariantMetadata`; added `ViewFileToolConfig.enable_open_document`.
  - `UserSettings`: Added `terminal_placement` (48) and `agent_sound_volume` (49).
  - `ConversationGroupConfig`: Added `sort_mode` (3) and `conversation_ids` (4).
  - `DeploymentConfig`: Added `preserve_memory_mounts` (33), `enable_periodic_backup` (34), and `vmstorage_config` (35).
  - `Project` / `Resource`: Added `Project.backend_type` (14) and `Resource.remote_resource` (4).
  - `vmstorage_config_jspb`: Added `MountedDirectory`, `VmstorageConfig`, `VolumeClientConfig`, and `VolumeCreationConfig`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `loading_bridge.js`: Added `promptAuth` event handling with dedicated `auth-container` UI.

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.09.16-7 (mainline @981987536)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.7.0_RC00`
  - `BUILD_HOSTNAME`: `livj7.prod.google.com`

---

## [v1.6.0] - 2026-09-29

### Terminal context, resumable downloads, and native OS notifications
You can now mention @terminal to pull active selections or recent terminal execution output directly into chat context. This release also adds resumable HTTP range binary downloads, in-surface webview error screens for server crash recovery, and native IDE toast notifications.

### Highlights
- **Terminal Context Integration & `@terminal` Mentions**: Introduced the integrated `TerminalStateTracker` and contributed `antigravity.insertTerminalSnippet` ("Add Terminal Selection or Output to Chat"), allowing users to add active terminal selections or recent terminal execution output directly into chat context via context menus or `@terminal` mention pills.

- **Resumable HTTP Range Downloads & Stall Inactivity Guard**: Upgraded the CLI binary downloader with HTTP `Range` and `If-Range` resumption (validated via `ETag` and `Last-Modified`), chunk-inactivity stall timeouts (`DEFAULT_DOWNLOAD_INACTIVITY_TIMEOUT_MS = 30000`), and automatic 24-hour cleanup of abandoned staging artifacts (`agy.tmp.<uuid>` / `.unpack_<hex>`).

- **In-Surface Webview Error Screen & Mid-Session Crash Recovery**: Added a unified error component (`webview_error_component.ts`) with "Try again" and "Report issue" controls. Paired with `serverManager.onServerCrash`, unexpected process terminations immediately flip active webviews into an error state instead of hanging on dead loopback ports.

- **Cloud Developer Environments (CDE) Authentication & Web UI**: Introduced `CdeAuthService` and `WebUiWebviewDelegate` for browser-hosted VS Code (Cloud Workstations and Cloud Shell), automating gateway access token parameter injection (`_workstationAccessToken`, `_cloudshellAccessToken`) and token redaction in logs.

- **Focus-Safe Inline Diff Lifecycle & Streaming Edit Serialization**: Enhanced inline diff management to ignore `FocusOut` auto-saves, preventing editor tab navigation or window defocusing from prematurely rejecting diffs; introduced global edit locks (`globalProcessingLock`) to serialize streaming edits across multiple files and turns cleanly.

- **In-IDE Native Toast & OS Notifications**: Implemented `VscodeNotificationDelegate` bridging webview agent completions and `/grill-me` interactive questions to native VS Code toasts with "Open Chat" actions and desktop OS notification banners.

### Improvements
- **Terminal Shell Integration & Context Category Provider**:
  - Connected `TerminalStateTracker` to VS Code's Shell Integration API (`TerminalShellExecution`, `onDidStartTerminalShellExecution`, `onDidEndTerminalShellExecution`).
  - Buffers up to 8,192 characters of recent terminal output per terminal with ANSI escape sequence scrubbing (`stripAnsiCodes`).
  - Contributed `antigravity.insertTerminalSnippet` command to command palette and `terminal/context` menu group.
  - Fallback logic checks active selection, bounces through clipboard (`workbench.action.terminal.copySelection`), or captures recent buffer output.
  - Registered dynamic `@terminal` context category provider with `TERMINAL_CATEGORY_ICON_URI`.

- **Resumable Binary Downloads & Artifact Hygiene**:
  - Added HTTP `Range` request support in `downloadFile` using `If-Range` matching against in-memory `downloadResumeValidators`.
  - Added `StallGuard` monitoring stream chunk inactivity and aborting stalled connections after 30 seconds.
  - Implemented `cleanupStaleDownloadArtifacts` purging staging files (`agy.tmp.<uuid>`, `agy.tmp.<uuid>.tar.gz`) and unpack directories (`.unpack_<hex>`) older than 24 hours (`STALE_DOWNLOAD_ARTIFACT_MAX_AGE_MS`).
  - Non-monotonic progress reporter via `WeakMap<Progress, number>` preventing progress bar double-counting across retry attempts.

- **Mid-Session Server Crash Recovery & Error Surface**:
  - `AntigravityServerManager` now emits `onServerCrash` for unexpected mid-session process terminations (non-zero exits or signals such as SIGTERM/SIGKILL).
  - Webview renderer flips active iframe surfaces into `webview_error_component` on backend disconnect.
  - "Report issue" action bypasses server health checks (`skipHealthCheck: true`) to immediately present the offline feedback form (`antigravity.feedback`).

- **Cloud Developer Environments (CDE) Architecture**:
  - Added `CdeAuthService` detecting Cloud Workstations (`CLOUD_WORKSTATIONS=true`) and Cloud Shell (`CLOUD_SHELL=true`) or the companion `google.cloud-developer-environments-auth` extension.
  - Automatically exports `ANTIGRAVITY_CDE=true` into the language server spawn environment.
  - Added `WebUiWebviewDelegate` instantiated when `vscode.env.uiKind === vscode.UIKind.Web`.
  - Appends gateway HTTP access tokens (`urlParameter=token`) for remote iframe loading and redacts sensitive tokens from console logs.

- **Inline Diff Save & Lifecycle Enhancements**:
  - Filtered out `TextDocumentSaveReason.FocusOut` from auto-save rejection hooks, preventing window switching from discarding pending diffs.
  - Disk byte snapshotting (`preFocusOutDiskBytes`) restores modified content if a focus-out save flushes combined text.
  - Tab closure listener now awaits active finalizations (`finalizingUris`) before evaluating rejection.
  - Buffer dirty detection sets `hasUserEdits = true` and dynamically recalculates modified/original texts by stripping hunk lines.
  - Added `lineEndChar` boundary safety function in `inline_diff_change_range.ts` preventing document line out-of-bounds exceptions.
  - Added global mutex `globalProcessingLock` for inline diff zone creation to eliminate race conditions between streaming edit chunks across turns.

- **Configurable Settings**:
  - Contributed `antigravity.serverStartupTimeoutMs` (number, default 30,000ms): timeout waiting for backend health check.
  - Contributed `antigravity.autoAcceptOnChat` (boolean, default true): auto-accept background pending edits upon sending a new chat prompt.
  - Contributed `antigravity.releaseBaseUrl` (string, default ""): base URL override for CLI downloads.
  - Contributed `antigravity.serverArgs` (array of strings, default []): additional command-line arguments passed to `agy --hub`.

- **CitC & Workspace Identifier Converters**:
  - Added `devtools/cider/webclient/citc/converters.ts` with `convertStringToVcs`, `convertVcsToString`, and `convertVcsToContextName`.
  - Supported CitC workspaces without aliases via `getNameOrCitcId()`.
  - Added `CITC = 6` to `WorkspaceId.Vcs`.

- **Protocol & Schema Additions**:
  - `codeium_common_pb.ts`: Added dynamic custom-gateway model placeholders `MODEL_PLACEHOLDER_M334` through `MODEL_PLACEHOLDER_M365` (values 1334–1365); added `opus-5.5` variants (`dropdown` 1366, `medium` 1367, `max-bon-le` 1368, `low` 1369, `high` 1370, `max` 1371); added `lsp-slot1-lc-jetski` (1372) and `barium-b-tool-leakage-fix-tf` (1373); added `CASCADE_NUX_LOCATION_SERVICE_ANNOUNCEMENT_BANNER = 16`.
  - `cortex_pb.ts`: Added `RunCommandToolConfig.SandboxProxy` and `Http` message schemas; added `LoadedCustomization.Status.STATUS_ERROR = 4`; added `StepRenderInfo.StepBlock`, `ContentBlock`, and `Badge` message descriptors; added `CortexTrajectorySource` enum entries (`CIDER = 20`, `GEMINI_APP = 21`, `VSCODE = 22`, and `VISUAL_STUDIO = 23`); added `SensitivityLevel` enum (`UNSPECIFIED = 0`, `STANDARD = 1`, `REDACTED = 2`).
  - `UserSettings`: Added `SandboxProxy` with `Http` (`address`, `cert_file`).
  - `DeploymentConfig`: Added `x20_gemini_dir_prefix` (field 32).
  - `MemoryMountConfig`: Removed `SojoBackendConfig` (oneof `backend_config_` fields updated to `[1, 2, 3, 5, 8]`).
  - `SemanticType`: Added `ST_ADS_SAFETY_ID = 1129`.
  - `DataCloudMetadataKey`: Added metrics keys for selected services, API enablement, and missing IAM permissions.

- **Dependency Upgrades**:
  - Upgraded `gaxios` from `v6_7_1` to `v7_1_1`.
  - Removed obsolete `is_stream` package.

### Fixes
- **Focus-Out Diff Discard Regression**: Fixed an issue where editor window focus loss or switching tabs triggered `FocusOut` auto-saves that erroneously reverted unreviewed inline diffs and closed diff sessions.

- **Mid-Session Language Server Crash Blank Screen**: Prevented extension webviews from hanging indefinitely on dead HTTP ports when the language server process exits prematurely, immediately rendering an in-surface retry and diagnostic reporting screen.

- **Terminal Selection Capture Fallback**: Resolved issues where `terminal.selection` returned undefined on desktop hosts by routing selection capture through temporary clipboard synchronization and falling back to the recent execution output buffer.

- **Inline Diff Multi-File Race Conditions**: Eliminated race conditions when streaming edits arrive simultaneously across multiple files by introducing a global processing lock for inline diff zones.

- **Per-File Diff Listener Leakage**: Fixed subscription accumulation in `InlineDiffZoneRenderer` by managing disposables in a dedicated `fileSubscriptions` map keyed by normalized file URI.

- **Hunk Line End Boundary Protection**: Prevented out-of-range index crashes when resolving diff hunks whose additions or deletions touch the end of a truncated document buffer via `lineEndChar`.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `binary_downloader.ts`:
    - Added `StallGuard` and `createStallGuard` with `DEFAULT_DOWNLOAD_INACTIVITY_TIMEOUT_MS = 30000`.
    - Added HTTP Range resumption: `downloadResumeValidators`, `resolveResumeOffset`, `buildDownloadHeaders`, `assertResumableContentRange`, `rememberResumeValidator`, and `clearDownloadResumeState`.
    - Added `cleanupStaleDownloadArtifacts` with `STAGING_FILE_PATTERN` (`/^agy\.tmp\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.tar\.gz)?$/i`), `UNPACK_DIR_PATTERN`, and `STALE_DOWNLOAD_ARTIFACT_MAX_AGE_MS` (24h).
    - Added `downloadProgressHighWater` `WeakMap` enforcing monotonically increasing progress reports.
  - `server_manager.ts`:
    - Added `onServerCrash` event emitter and `serverCrashEmitter.fire({ code, signal, reason })`.
    - Added `ensureLoopbackNoProxy` ensuring `localhost` and `127.0.0.1` are appended to `NO_PROXY` / `no_proxy`.
    - Added `resolveActiveCwd` picking first existing workspace folder, falling back to extension directory or `os.homedir()`.
    - Added `resolveServerStartupTimeoutMs` resolving `serverStartupTimeoutMs` config or `ANTIGRAVITY_SERVER_READY_TIMEOUT_MS`.
    - Added `isDownloadTimeoutError` detecting DOM `TimeoutError` and download stall messages.
    - Updated `waitForServerReady` to alternatingly probe `${url}/healthz` and root `${url}` with `{ agent: false }`, validating process liveness via `isProcessAlive`.
    - Added fallback regex parsing of CLI version from output channel logs in `getHostDiagnostics`.
  - `extension.ts`:
    - Replaced `DesktopWebviewDelegate` instantiation with `createWebviewDelegate(context)`.
    - Registered `vscode_notification_delegate.VscodeNotificationDelegate`.
    - Wired `antigravity.autoAcceptOnChat` configuration listener to `agentEditManager.setAutoAcceptOnChat()`.
    - Listened to `serverManager.onServerCrash` to broadcast `apiImpl.broadcastServerError()`.
    - Exported `TEST_ONLY = { desktopSetup }`.
  - `cde_auth_service.ts`:
    - New singleton service `CdeAuthService` detecting Cloud Workstations and Cloud Shell.
    - Interacts with companion extension `google.cloud-developer-environments-auth` (`DeveloperEnvironmentsAuthApi`) to fetch `EnvironmentHttpAccessToken`.
  - `vscode_notification_delegate.ts`:
    - New class `VscodeNotificationDelegate` implementing `BrowserNotificationDelegate`.
    - Displays VS Code toast with "Open Chat" / "Dismiss" buttons and triggers Linux `notify-send`.
  - `webview_delegate.ts`:
    - Replaced old delegate with factory `createWebviewDelegate(context)` returning `WebUiWebviewDelegate` for web environments and `DesktopWebviewDelegate` for desktop.
    - Resolves CDE iframe gateway URLs with `_workstationAccessToken` / `_cloudshellAccessToken` query params.
    - SVG animation phase alignment with `getProgressPhaseDelay()`.
  - `webview_error_component.ts`:
    - In-surface error UI templates (`getErrorContentHtml`, `getLoadingErrorContentHtml`) with error icon, "Try again", and "Report issue".
    - Client-side connectivity watcher script (`getErrorWatcherScript`) polling iframe health.
  - `feedback.ts`:
    - Refactored feedback submission flow with gzip compression (`zlib.gzipSync`) and host diagnostics attachment.
  - `status_bar.ts`:
    - Updated `antigravity.feedback` to accept `ProvideFeedbackOptions` (`skipHealthCheck`, `detail`, `title`, `description`).

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `terminal_state_tracker.ts`:
    - New class `TerminalStateTracker` listening to `onDidOpenTerminal`, `onDidCloseTerminal`, `onDidStartTerminalShellExecution`, `onDidEndTerminalShellExecution`.
    - Buffers terminal output up to 8KB per terminal and strips ANSI codes via `stripAnsiCodes`.
    - Exports `TERMINAL_CATEGORY_ICON_URI` and provides context items for `@terminal`.
  - `extension_api.ts`:
    - Instantiated and registered `TerminalStateTracker`.
    - Contributed `insertTerminalSnippet` command with clipboard fallback and terminal output capture.
    - Contributed `openConversation` command accepting `cascadeId` and `path`.
    - Added `broadcastServerError(detail)` and `broadcastServerRecover()`.
    - Used `{ preserveFocus: true }` when ensuring main instance.
  - `diff_zones/inline_diff_manager.ts`:
    - Added `finalizingUris` map to serialize save-driven finalization against tab closures.
    - Added `preFocusOutDiskBytes` map to preserve unreviewed disk bytes across FocusOut saves.
    - Added `applyingDiffUris` set to prevent change listener recursion during diff application.
    - Filtered out `TextDocumentSaveReason.FocusOut` from auto-save rejection.
    - Added `hasUserEdits` boolean flag on `ActiveDiff`.
    - Hardened `rejectAll()` to check for superseded diffs before writing original text.
  - `diff_zones/agent_edit_manager.ts`:
    - Added `globalProcessingLock` to serialize inline diff zone creation globally across files.
    - Added `priorTurnContents` map to preserve previous turn buffer texts.
    - Handled `isSameTurnStreaming` for streaming inline edits.
    - Added `setAutoAcceptOnChat` and `setAgeOutThreshold`.
  - `diff_zones/inline_diff_zone_renderer.ts`:
    - Replaced global subscriptions array with `fileSubscriptions` map keyed by normalized file URI.
    - Added `disposeDiffZone(fileUri)` and `hasUserEditedZone(fileUri)`.
  - `diff_zones/inline_diff_change_range.ts`:
    - Added `lineEndChar` boundary safety helper for hunk coordinate calculations.
  - `webclient/workspace/ids.ts` & `webclient/citc/converters.ts`:
    - Added `getNameOrCitcId(workspaceId)` supporting CitC workspaces without aliases.
    - Added `convertStringToVcs`, `convertVcsToString`, `convertVcsToContextName`.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - Reconstructed 929 Google3 Piper monorepo modules (526 Closure, 403 CJS).
  - New Schemas & Messages:
    - `RunCommandToolConfig.SandboxProxy` and `Http` in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `StepRenderInfo.StepBlock` (schema index 398, 7), `ContentBlock` (schema index 398, 8), and `Badge` (schema index 398, 9) in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `UserSettings.SandboxProxy` and `UserSettings.SandboxProxy.Http` in `third_party/jetski/jetbox_state_pb/`.
    - `citc/converters.ts` in `devtools/cider/webclient/citc/converters.ts`.
  - Updated Fields & Enums:
    - `Model`: Added dynamic placeholders 1334–1365 (`custom-gateway-dynamic-models`), `opus-5.5` models (1366–1371), `lsp-slot1-lc-jetski` (1372), and `barium-b-tool-leakage-fix-tf` (1373).
    - `CascadeNUXLocation`: Added `CASCADE_NUX_LOCATION_SERVICE_ANNOUNCEMENT_BANNER = 16`.
    - `LoadedCustomization.Status`: Added `STATUS_ERROR = 4`.
    - `CortexTrajectorySource`: Added `CIDER = 20`, `GEMINI_APP = 21`, `VSCODE = 22`, and `VISUAL_STUDIO = 23`.
    - `SensitivityLevel`: Added enum values `UNSPECIFIED = 0`, `STANDARD = 1`, `REDACTED = 2`.
    - `WorkspaceId.Vcs`: Added `CITC = 6`.
    - `DeploymentConfig`: Added `x20_gemini_dir_prefix` (field 32).
    - `MemoryMountConfig`: Removed `SojoBackendConfig` (oneof `backend_config_` fields updated to `[1, 2, 3, 5, 8]`).
    - `SemanticType`: Added `ST_ADS_SAFETY_ID = 1129`.
    - `DataCloudMetadataKey`: Added keys `SELECTED_SERVICES`, `SERVICES_COUNT`, `APIS_TO_ENABLE`, `ENABLED_APIS`, `DISABLED_APIS`, `MISSING_PERMISSIONS`, `MISSING_PERMISSIONS_COUNT`, `SERVICES_WITH_MISSING_PERMISSIONS`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `loading_bridge.js`: Added handler for `report-button` posting `{ type: "reportIssue" }` and integrated unified `.visible` class toggling.
  - `bridge.js`: Re-bundled with updated protobuf schemas (`RunCommandToolConfig.SandboxProxy`, `SensitivityLevel`, `StepBlock`, `CortexTrajectorySource`, `UserSettings.SandboxProxy`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_DEPOT_PATH`: `//depot/google3`
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.09.11-2 (mainline @979001970)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.6.0_RC00`
  - `BUILD_HOSTNAME`: `lmbjo12.prod.google.com`

---

## [v1.5.0] - 2026-09-23

### Fast-path binary caching, save-aware diffs, and eager server boot
Lightweight filesystem stat caching replaces full SHA-256 checks on backend binaries, eliminating multi-second cold-start freezes. This release also makes inline diffs save-aware, reconciles discarded tab buffers, and scopes Git refreshes directly to repository roots.

### Highlights
- **Fast-Path Binary Stat-Based Identity Caching (b/561981286)**: Replaced multi-second full-file SHA-256 hash calculations on the ~200 MiB backend binary with lightweight filesystem stat tuples (`path:size:mtimeMs:ctimeMs:ino`), eliminating significant startup lag on Windows and cold starts.

- **Save-Aware Inline Diff Lifecycle**: Inline diff sessions now actively intercept document save events: manual saves (`Cmd+S` / `Ctrl+S`) apply and accept pending modifications, while automatic background saves revert to original text to prevent unreviewed diffs from leaking to disk.

- **Tab Discard & Dirty State Reconciliation**: Integrated tab group change listeners (`onDidChangeTabs`) to detect tab closures where dirty buffer state is discarded without closing the document model, automatically rejecting unapplied diffs and restoring original disk content.

- **Targeted Multi-Repo Git Refresh (b/561494994)**: Scoped Git status refreshes directly to the owning repository root URI via the VS Code Git extension API, eliminating annoying "Choose a repository" quick pick prompts in multi-root workspaces and modal errors in non-Git directories.

- **Autonomous Command Adjudication & Auto-Execution Preset**: Introduced `AgentPermissionPreset.AUTO` and `CommandAssessorConfig`, enabling an adjudicator agent to determine whether unsandboxed terminal commands are reversible before permitting auto-execution.

- **Eager Background Server Pre-warming**: The extension host now eagerly boots and pre-warms the backend language server upon activation with secure CSRF token binding (`--csrf_token`), exposing `AntigravityExtensionApi` with active port and token metadata.

### Improvements
- **Manual & Auto-Save Inline Diff Interception**:
  - Manual saves (`TextDocumentSaveReason.Manual`) synchronously substitute the active buffer with clean modified text via `event.waitUntil` and finalize the diff session as accepted upon save completion.
  - Auto-saves (`AfterDelay`, `FocusOut`) revert buffer content to `originalText` before disk writes to keep filesystem state clean, tracking pending auto-saves to finalize diffs as rejected.
  - Added recursive save protection with `internalSaveUris` set.

- **Tab Closure Detection**: Monitored `vscode.window.tabGroups.onDidChangeTabs` to catch when editors are closed with "Don't Save", ensuring discarded buffer edits trigger `rejectAll` and restore clean disk state.

- **Guaranteed Disk Reversion on Rejection**: `rejectAll` directly flushes `originalText` to disk using `vscode.workspace.fs.writeFile`, safeguarding against lost disk state when editor buffers are closed or torn down.

- **Eager Server Startup & API Export**:
  - `activate()` now returns a typed `AntigravityExtensionApi` contract exposing `csrfToken` and a reactive `port` getter.
  - Starts the backend server in the background during extension activation if no remote `serverUrl` is configured, reducing first-open latency for the webview.
  - Added `--csrf_token` argument propagation to `agy --hub` backend invocations.

- **Safe Release Base URL Resolution & Environment Override**:
  - Added `resolveReleaseBaseUrl` and `validateAndNormalizeReleaseBaseUrl`, supporting `AGY_RELEASE_BASE_URL` environment variable overrides.
  - Strictly enforces TLS (`https:`) for remote release endpoints (loopback `http://localhost` / `http://127.0.0.1` permitted for local development) to block MITM attacks.
  - Automatically redirects deprecated release bucket `https://storage.googleapis.com/antigravity-releases` to the official default endpoint.

- **Fail-Fast Integrity & Signature Verification**:
  - Release manifests lacking cryptographic checksums (`sha512` / `sha256`) fail immediately before multi-hundred-megabyte binary downloads.
  - Added `verifyBinarySignature` utilizing Node `crypto.verify` directly on `Buffer` without heap reallocation for future Ed25519 signature enforcement.

- **Virtual Diff Document Invalidation (`jetski-diff://`)**:
  - Implemented `onDidChange` event emitter on `ExtensionApiImpl` complying with `vscode.TextDocumentContentProvider`. Firing content change events forces VS Code to purge cached virtual documents when reopening diffs for the same file.
  - Added `safeDecodeURIComponent` to prevent URI decoding exceptions on malformed escape sequences.

- **New Conversation Timeout Budget**: Added a bounded 2-second timeout to `newConversation()`; if the main view fails to respond, it automatically resets `lastConversationId` and reconnects to avoid blocking the user.

- **Reset Conversation Command**: Contributed `${prefix}.resetConversation` (`antigravity.resetConversation`) to clear workspace conversation state and trigger reconnect.

- **Webview Instance Isolation**: Replaced global webview object property decoration with a `WeakSet<Webview>` in `DesktopWebviewDelegate`, preventing prototype contamination of third-party extension webviews (e.g. GitLens).

- **Protocol & Schema Expansions**:
  - `codeium_common_pb.ts`: Added `AgentPermissionPreset.AUTO` (value 6); updated `CascadeCommandsAutoExecution.AUTO` adjudicator semantics; added model mappings for `argon-sum` (1330), `gemini-3.8-flash-cyber-vertex` (1331), `fable-5.1-max-bon-le` (1332), and `gemini-3.8-flash-high-raw-thoughts` (1333); added `ingestion_options` to `Media`.
  - `cortex_pb.ts`: Added `WorkspaceInitializationDataGitOnBorg` (index 34) for Git-on-Borg/Cog workspaces; added `LoadedCustomizations` and `LoadedCustomizations.LoadedCustomization` (index 342) tracking environment customization snapshots (`BUILTIN`, `GLOBAL`, `WORKSPACE` scopes; `ENABLED`, `DISABLED`, `TRUNCATED` statuses); added `StepRenderInfo.AgentRef` (index 398, 6) for subagent references in step headers; added `rules_token_budget` to `CascadePlannerConfig`; added `CommandAssessorConfig` (Next ID: 7); added `tool_source` to `CortexStepMetadata`.
  - `hooks_pb.ts`: Added `HookCheckpoint` message (field 9 in `HookInjectedStep`); added `agent_name` and `parent_conversation_id` to `HookArgsCommon`; added `decision`, `reason`, and `permission_overrides` to `PreToolHookResult`; added `overwrite_result` to `PostToolHookResult`.
  - `jetski_cortex_pb.ts`: Added `ExecutionStatus` for transient execution phase surfacing; added `ModelRequestStatus` for retry-after countdowns; added `PendingAgentMessagesUpdate`.
  - `MemoryMountConfig` & `FuseConfig`: Added `SojoBackendConfig` (target, agent_id, read_only) and `MemoryBankBackendConfig` (target, parent, agent_id, bundle_type, read_only) oneofs; added `sql_max_ram_mb` (field 30, default 8192) in `FuseConfig`; added `force_experiments` (field 8) in `MemoryConfig`.
  - `GoogleSpecificConfig`: Added `magic_workspace_cog_config` (`CogWorkspaceConfig` with `repo_name` and `branch_name`).

### Fixes
- **Binary Identity Hash Latency (b/561981286)**: Eliminated repeated SHA-256 computation over the 200 MiB binary during extension startup, switching to filesystem `stat` metadata keys and cutting seconds off cold boot times.

- **Multi-Repo Git Refresh Prompt Spam (b/561494994)**: Fixed an issue where unqualified `git.refresh` command executions caused VS Code to prompt users with a "Choose a repository" dropdown or show modal errors in non-Git workspaces.

- **File Creation Replay Divergence (b/561515185)**: Corrected divergence evaluation for new file creations with empty original content, preventing replayed edit turns from overwriting subsequent user edits.

- **Resolved Diff Navigation Flashing**: In `AgentEditManager`, checked `hunkStorage.hasAnyResolutions(message)` upfront before attempting inline zone rendering, ensuring files resolved in earlier turns immediately open read-only diffs without UI flicker.

- **Webview PostMessage BigInt Scrubber**: Fixed BigInt JSON serialization sanitization to prevent throwing uncaught exceptions on circular or non-serializable payloads.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `binary_downloader.ts`:
    - Replaced `computeFileSha256` in `binaryVersionCache` with `getBinaryIdentityKey` (`[binaryPath, stats.size, stats.mtimeMs, stats.ctimeMs, stats.ino].join(':')`) to resolve b/561981286.
    - Added `resolveReleaseBaseUrl()` and `validateAndNormalizeReleaseBaseUrl()` enforcing HTTPS/localhost protocol validation and supporting `AGY_RELEASE_BASE_URL`.
    - Added `verifyBinarySignature()` performing Ed25519 signature checks using `crypto.verify` directly on Buffer inputs.
    - Added fail-fast manifest integrity check in `acquireInstalledBinaryPath` rejecting manifests missing both `sha512` and `sha256`.
  - `extension.ts`:
    - Exported `AntigravityExtensionApi` record interface (`csrfToken`, `port`).
    - Made `activate()` async returning `Promise<AntigravityExtensionApi>`.
    - Added eager server pre-warm via `serverManager.start()` when `ANTIGRAVITY_SERVER_URL` is unset.
    - Added `getConfiguredServerUrl()` helper.
  - `server_manager.ts`:
    - Added `--csrf_token=${this.csrfToken}` to language server startup arguments.
    - Added `port` and `csrfToken` tracking to `AntigravityServerManager`, resetting state on process exit and startup exceptions.
  - `desktop_webview_delegate.ts`:
    - Replaced property mutation `_patchedForBigInt` with `WeakSet<Webview>` (`patchedWebviews`).
    - Added `DisposableWebview` record type.
    - Cleaned up BigInt stringifier fallback handling.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `diff_zones/inline_diff_manager.ts`:
    - Subscribed to `vscode.workspace.onWillSaveTextDocument` (`handleDocumentWillSave`) and `vscode.workspace.onDidSaveTextDocument` (`handleDocumentDidSave`).
    - Added manual vs. auto-save differentiation (`pendingManualSaveUris`, `pendingAutoSaveUris`, `internalSaveUris`).
    - Subscribed to `vscode.window.tabGroups.onDidChangeTabs` (`handleTabsChange`) to reject discarded edits upon tab closure.
    - Implemented `getOwningGitRepository()` and `refreshGitForUri()` resolving repository ownership before executing `git.refresh` (b/561494994).
    - Hardened `rejectAll()` to write `originalText` directly via `vscode.workspace.fs.writeFile`.
    - Added `findActiveDiffFuzzy()` with URI normalization.
  - `diff_zones/agent_edit_manager.ts`:
    - Fixed empty-original divergence check in `doesDocMatchEdit()` (b/561515185).
    - Added upfront resolution check `this.hunkStorage.hasAnyResolutions(message)`.
    - Handled review sidebar navigation (`isNavigationOnly = message?.turnIndex == null && strictNav`).
    - Added URI normalization and robust index/hash lookup in `handleHunkResolved()`.
  - `diff_zones/inline_diff_zone_renderer.ts`:
    - Applied `normalizeUri` when matching resolution events to diff zones.
  - `extension_api.ts`:
    - Implemented `onDidChangeTextDocumentContentEmitter` / `onDidChange` on `ExtensionApiImpl` for `TextDocumentContentProvider` cache busting.
    - Added `safeDecodeURIComponent()` for resilient URI decoding across virtual diff content maps.
    - Registered `antigravity.resetConversation` command.
    - Added 2-second timeout race in `newConversation()`.
    - Refactored `initializeViewAsync()` to await `view.ready` before pushing comments and diff state.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - Reconstructed 921 Google3 Piper monorepo modules (519 Closure, 402 CJS).
  - New Schemas & Messages:
    - `WorkspaceInitializationDataGitOnBorg` (schema index 34) in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `LoadedCustomizations` and `LoadedCustomizations.LoadedCustomization` (schema index 342) in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `StepRenderInfo.AgentRef` (schema index 398, 6) in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `ExecutionStatus` (schema index 6) and `ModelRequestStatus` (schema index 7) in `third_party/jetski/jetski_cortex_pb/jetski_cortex_pb.ts`.
    - `PendingAgentMessagesUpdate` (schema index 24) in `third_party/jetski/jetski_cortex_pb/jetski_cortex_pb.ts`.
    - `HookCheckpoint` (schema index 5) in `third_party/jetski/hooks_pb/hooks_pb.ts`.
    - `CogWorkspaceConfig` in `third_party/jetski/jetbox_state_pb/jetbox_state_jspb/jspb$m$CogWorkspaceConfig.js`.
    - `SojoBackendConfig` and `MemoryBankBackendConfig` in `learning/gemini/agents/projects/memory/fuse/proto/config_jspb/`.
  - Updated Fields & Enums:
    - `AgentPermissionPreset`: Added `AGENT_PERMISSION_PRESET_AUTO = 6`.
    - `Model`: Added placeholders 1330 (`argon-sum`), 1331 (`gemini-3.8-flash-cyber-vertex`), 1332 (`fable-5.1-max-bon-le`), and 1333 (`gemini-3.8-flash-high-raw-thoughts`).
    - `CascadePlannerConfig`: Added field `rules_token_budget` (Next ID: 60).
    - `CommandAssessorConfig`: Updated Next ID to 7.
    - `CortexStepMetadata`: Added field `tool_source` (Next ID: 39).
    - `CortexStepRunCommand`: Updated Next ID to 36.
    - `HookArgsCommon`: Added field 9 `agent_name` and field 10 `parent_conversation_id`.
    - `PreToolHookResult`: Added field 4 `decision`, field 5 `reason`, and field 6 `permission_overrides`.
    - `PostToolHookResult`: Added field 1 `overwrite_result`.
    - `MemoryConfig`: Added field 8 `force_experiments` (repeated string).
    - `FuseConfig`: Added field 30 `sql_max_ram_mb` (optional int64, default 8192).
    - `MemoryMountConfig`: Added oneof field 7 `sojo` and field 8 `memory_bank`.
    - `GoogleSpecificConfig`: Added field 2 `magic_workspace_cog_config`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `bridge.js`: Re-bundled with updated protobuf descriptors (`AgentPermissionPreset.AUTO`, `LoadedCustomizations`, `ExecutionStatus`, `ModelRequestStatus`, `CogWorkspaceConfig`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_DEPOT_PATH`: `//depot/branches/antigravity_vscode_extension_release_branch/985059174.1/google3`
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.09.11-2 (mainline @979001970)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.5.0_RC02`
  - `BUILD_HOSTNAME`: `jgbho14.prod.google.com`

---

## [v1.4.0] - 2026-09-17

### In-IDE feedback diagnostics, cold-start freeze fixes, and network resilience
Report issues and inspect host logs directly inside the editor with the new antigravity.feedback diagnostics screen. This release also eliminates cold-start freezes in offline environments with a 3-second update budget and adds Retry-After backoff intelligence.

### Highlights
- **In-IDE Feedback & Diagnostics Collection**: Added an integrated feedback command (`antigravity.feedback`) and a high-performance, ring-buffered logging subsystem (`BufferedOutputChannel`) enabling diagnostic bundles and host installation logs to be inspected and reported directly within the IDE.

- **Fast-Path Startup & Startup Freeze Elimination**: Eliminated the ~94.5s cold-start freeze during offline or unreachable network states (b/559283462). When an existing valid backend binary is present, update discovery operates on a bounded 3-second budget, falling back immediately to the existing binary without delaying editor readiness.

- **Offline & Network Fallback Resilience**: Implemented automatic fallback to existing valid binaries (`>= 1.1.11`) upon update download failure, ensuring full offline capability while safeguarding against corrupted payloads by strictly enforcing integrity and signature verification.

- **Rate-Limiting & Backoff Intelligence**: Added `Retry-After` HTTP header support (parsing delta-seconds and HTTP-date timestamps) to respect upstream rate limiting (HTTP 429) across manifest discovery and asset downloads.

- **Agent Lifecycle Hooks & Clickable Step Diff Badges**: Introduced foundational protobuf schemas for workspace agent lifecycle hooks (`HooksDiscoveryConfig`), step title diff badges (`StepRenderInfo.FileDiffRef`), and contextual link scope references (`LinkScopeItem`).

### Improvements
- **Integrated Feedback Command**: Contributed `antigravity.feedback` ("Provide Feedback") to the command palette and status bar settings flow, connecting to in-webview feedback panels.

- **Buffered Output Channel**: Implemented `BufferedOutputChannel` wrapping `vscode.OutputChannel` with an in-memory 1,000-line circular ring buffer and persistent append-only disk logging to `~/.gemini/logs/install.log`.

- **Host Diagnostics RPC**: Added `GetHostDiagnosticsRequest` and `GetHostDiagnosticsResponse` protobuf IPC endpoints, exposing host-level installation logs, binary path, and version to the webview client.

- **Fast-Path Binary Verification**: When a locally installed binary satisfies `MIN_AGY_VERSION` (`1.1.11`), the update check is bounded to a 3-second timeout budget (`updateCheckTimeoutMs: 3000`). If unreachable, the check is skipped and the existing binary boots immediately.

- **Offline Binary Availability**: Network or HTTP errors during update download gracefully fall back to the existing installed binary meeting minimum version requirements, preserving offline development workflows.

- **Retry-After Header Parsing**: Added `parseRetryAfterMs` to dynamically respect HTTP `Retry-After` headers during exponential backoff, preventing request flooding on rate-limited endpoints.

- **Safe Staging & Atomic Binary Promotion**: Binary downloads now unpack into an isolated temporary extraction directory (`tempExtractDir`), verify the executable, and atomically promote it before guaranteed cleanup in `finally` blocks.

- **Host Proxy Configuration**: Added `configureHostProxyEnvironment` to read VS Code's `http.proxy` and `http.noProxy` workspace configuration and configure `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` in the host process before binary acquisition.

- **Old Binary Cleanup**: Added `cleanupStaleOldBinaries` to automatically sweep orphaned temporary binary artifacts from `~/.gemini/bin/`.

- **Notebook AI Diff Alignment**: Migrated notebook diff hunk structures to `cider.ai.NotebookDiffHunk` and `cider.ai.NotebookDiffHunkType`, while refining Colab notebook cell metadata parsing to preserve cell ID mappings.

- **Notebook File Sync**: Replaced `vscode.AntigravityFiles.forceResolveFromFile` with `cider.ai.forceResolveFromFile` to ensure modified notebook files on disk are flushed prior to rendering inline diff zones.

- **Protocol & Schema Expansions**:
  - `cortex_pb.ts`: Added `HooksDiscoveryConfig` for workspace hook discovery; added `StepRenderInfo.FileDiffRef` for clickable (+N/-M) hunk badges in step headers.
  - `codeium_common_pb.ts`: Added `LinkScopeItem` for pasted external links (Critique CLs, issue trackers) with client-resolved metadata.
  - `config_pb`: Added `sort_order` (int32) to `ConversationGroupConfig`.
  - `cortex_pb` (JSPB): Added `version` (string) to `MarketplaceInstall`.
  - `learning/gemini/.../deployment/config_jspb`: Added `retrieval_query` (string) to `AmbientInjectionConfig`.
  - `semantic_annotations_pb.ts`: Added semantic types `ST_MODEL_TOOL_RESPONSE_URL` (1917) and `ST_YOUTUBE_EXTERNAL_VIDEO_TRACK_ID` (14203).
  - `verbalization_options_pb.ts`: Added `CitationGranularityOptions` under citation chunking options.

### Fixes
- **Network Startup Freeze (b/559283462)**: Fixed a critical bug where sequential probing of manifest candidate URLs hung for ~94.5s on unreachable networks. Candidate probing now sets a 5-second socket timeout with a single attempt per candidate, and aborts immediately upon encountering non-HTTP transport/socket failures.

- **Legacy Cascade Listener Deprecation**: Removed obsolete `vscode.Cascade` event subscriptions (`onDidRequestAcceptAllInFile`, `onDidRequestRejectAllInFile`, `onDidRequestNextHunk`, `onDidRequestPreviousHunk`, and `onDidDragToCascade`), eliminating stale IPC listeners.

- **License & Notice Alignment**: Updated `LICENSE.txt` to MIT License and refreshed `ThirdPartyNotices.txt` to reflect upstream package distribution metadata.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `buffered_output_channel.ts`: [NEW] Created `BufferedOutputChannel` implementing `vscode.OutputChannel` with circular in-memory buffer (`DEFAULT_MAX_BUFFERED_LINES = 1000`) and best-effort disk logging to `~/.gemini/logs/install.log`.
  - `server_manager.ts`: Implemented `HostDiagnosticsProvider` (`getHostDiagnostics()`, `getOrCreateOutputChannel()`, `getOutputChannelLogs()`); added `configureHostProxyEnvironment()` syncing VS Code `http.proxy` to `process.env`.
  - `binary_downloader.ts`:
    - Bumped `MIN_AGY_VERSION` from `1.1.3` to `1.1.11`.
    - Added `parseRetryAfterMs()` and updated `HttpError.fromResponse()` to extract `retry-after` header values.
    - Updated `withRetry()` to honor `retryAfterMs` delay.
    - Added fast-path 3-second timeout race when existing binary meets `MIN_AGY_VERSION`.
    - Added offline fallback: returns existing valid binary if network download fails (excluding checksum/integrity failures).
    - Hardened `fetchReleaseManifest()` candidate probing with 5-second candidate timeouts and immediate transport error bailout (b/559283462).
    - Unpacked archives into isolated `tempExtractDir` before atomic promotion via `promoteBinarySafely()`.
    - Added `cleanupStaleOldBinaries()` for directory hygiene in `~/.gemini/bin/`.
  - `status_bar.ts`: Registered `antigravity.feedback` command triggering `openAntigravitySettings('Provide Feedback')`.
  - `extension.ts`: Initialized proxy configuration during `activate()`; passed `hostDiagnosticsProvider` to extension API activation dependencies.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `extension_api.ts`:
    - Added `getHostDiagnostics(request)` returning `GetHostDiagnosticsResponse` message.
    - Updated `provideFeedback()` to route through `antigravity.feedback` in VS Code environments and `feedback.start` in Cider.
    - Removed obsolete `vscode.Cascade` listeners and `vscode.AntigravityFiles.onDidDragToCascade`.
  - `core_activation.ts`: Added `hostDiagnosticsProvider` to `JetskiCoreDependencies`.
  - `diff_zones/diff_zone_renderer.ts`: Migrated notebook diff types to `cider.ai.NotebookDiffHunk` and `NotebookDiffHunkType`; improved cell metadata preservation in `parseNotebookCells()`.
  - `diff_zones/agent_edit_manager.ts`: Replaced `vscode.AntigravityFiles.forceResolveFromFile` with `cider.ai.forceResolveFromFile`.
  - `webclient/workspace/ids.ts`: Simplified `getWorkspaceQueryParams()` to query `window.location.search` directly; removed redundant `getPreservableParams()`.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - Reconstructed 912 Google3 Piper monorepo modules (519 Closure, 393 CJS), adding `buffered_output_channel.ts`.
  - New Schemas & Messages:
    - `HooksDiscoveryConfig` (schema index 193) in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `StepRenderInfo.FileDiffRef` in `third_party/jetski/cortex_pb/cortex_pb.ts`.
    - `LinkScopeItem` (schema index 133) in `third_party/jetski/codeium_common_pb/codeium_common_pb.ts`.
    - `GetHostDiagnosticsRequest` and `GetHostDiagnosticsResponse` in `third_party/gemini_coder/proto/iframe_messages_pb.ts`.
    - `CitationGranularityOptions` in `google/ai/generativelanguage/v1main/verbalization_options_pb.ts`.
  - Updated Fields:
    - `AmbientInjectionConfig` (`config_jspb`): Added field 3 `retrieval_query` (string).
    - `ConversationGroupConfig` (`config_jspb`): Added field 2 `sort_order` (int32).
    - `MarketplaceInstall` (`cortex_jspb`): Added field 3 `version` (string).
    - `SemanticType` (`semantic_annotations_pb.ts`): Added `ST_MODEL_TOOL_RESPONSE_URL = 1917` and `ST_YOUTUBE_EXTERNAL_VIDEO_TRACK_ID = 14203`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `bridge.js`: Re-bundled with new protobuf descriptors (`GetHostDiagnosticsRequest`, `GetHostDiagnosticsResponse`, `HooksDiscoveryConfig`, `LinkScopeItem`, `FileDiffRef`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_DEPOT_PATH`: `//depot/branches/antigravity_vscode_extension_release_branch/980964133.1/google3`
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.09.02-1 (mainline @974746007)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.4.0_RC01`
  - `BUILD_HOSTNAME`: `oqbb8.prod.google.com`

---

## [v1.3.0] - 2026-09-10

### Branded activation experience, enterprise proxy support, and subagent schemas
A redesigned activation screen brings the official Antigravity logo, ambient glow effects, and smooth loading transitions to your sidebar. This release also adds enterprise root CA proxy discovery and keyboard-driven diff hunk controls under your cursor.

### Highlights
- **Branded Initialization & Loading Experience**: Overhauled the extension activation and webview loading interface with the official Antigravity logo, ambient glow effects, indeterminate progress bar, and smooth transitions.

- **Enterprise Proxy & ZTNA Support**: Automatic discovery and propagation of system root CA bundles across Linux and macOS, alongside HTTP/HTTPS proxy configuration inheritance, enabling seamless operation behind enterprise security gateways (e.g. Zscaler).

- **Cursor-Focused Diff Hunk Controls**: Introduced dedicated commands and context keys to accept or reject the specific diff hunk currently focused under the editor cursor, without requiring mouse interaction.

- **Subagents Architecture & Hub Schemas**: Introduced core protobuf schemas and persistence models for autonomous subagents (`SubagentDescriptor`, `SubagentMetadata`, `SubagentSpec`, `SubagentResult`, `SubagentState`).

- **Unified Remote & CitC Workspace Navigation**: Modularized remote workspace URI translation (`toCiderWebclientUri` / `toJetskiFileUri`), supporting linked worktree and Jujutsu (`jj`) commit resolution.

### Improvements
- **Branded Loading View**: Added vector Antigravity logo (`ANTIGRAVITY_LOGO_SVG`) with radial blur glow, styled product branding, animated progress bar, and 10s fallback reveal in `desktop_webview_delegate.ts`.

- **Focused Diff Hunk Commands**: Registered `antigravity.prioritized.agentAcceptFocusedHunk`, `agentRejectFocusedHunk`, `agentFocusNextHunk`, `agentFocusPreviousHunk`, `agentAcceptAllInFile`, and `agentRejectAllInFile`.

- **Active Diff Context Keys**: Added real-time tracking of unresolved hunks in the active document via `antigravity.canAcceptOrRejectFocusedHunk` and `antigravity.canAcceptOrRejectAllAgentEditsInFile`.

- **Enterprise Root CA Auto-Resolution**: Automatically detects OS certificate stores (`/etc/ssl/certs/ca-certificates.crt`, `/etc/pki/tls/certs/ca-bundle.crt`, `/etc/ssl/ca-bundle.pem`, `/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem`, `/etc/ssl/cert.pem`) and sets `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, and `NODE_USE_SYSTEM_CA` in the extension host and server process.

- **Proxy Configuration Propagation**: Reads VS Code `http.proxy` and `http.noProxy` settings and populates `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables for backend server processes.

- **Remote Worktree & Jujutsu Resolution**: Chat file links in linked worktrees and CitC workspaces are dynamically translated to accessible editor URIs (e.g. `jj-commits://`) via `workspaceManager.resolveFileUri()`.

- **Webview Double-Render Prevention**: Cached server resolution in `webview_renderer.ts` avoids redundant DOM teardown and recreation when opening secondary views (Settings, Artifacts, Terminal), eliminating blank flashes and latency (b/558282887).

- **Graceful Webview RPC Error Handling**: Suppressed noisy `ConnectError` (`NotFound`) rejections when webviews are mounting or not yet listening for editor state or category updates.

- **Non-Stealing View Reveal**: Added `show({ preserveFocus })` on `JetskiInstance` to reveal panels and views without stealing focus from active editors.

- **User Theme Preference Synchronization**: Added `UserThemePreferenceChangeMessage` protocol supporting bidirectional theme preference announcements between framed webview apps and host editors (b/545227979).

- **New Gemini Models & Vertex Settings**: Added enum mappings in `codeium_common_pb.ts` for `gemini-3.8-flash-cyber` (1317), `gemini-3.8-flash-high` (1318), `gemini-3.8-flash-medium` (1319), `gemini-3.8-flash-low` (1320), `gemini-3.8-flash (Cyber Permissive)` (1321), `gemini-3.8-flash-tiered` (1322), and `abc-hillclimbing-tf` (1323). Added `vertex_service_tier` in `UserSettings`.

- **Grounding Citations & Media ID**: Added `Source` and `GroundingMetadata` messages for search/document citations, and added `media_id` field to `Media`.

- **Plugin MCP Configuration**: Added `PluginMcpUserConfig` schema with configurable variables map for MCP plugins.

### Fixes
- **Safe `.git/index` Timestamp Updating**: Replaced dangerous `readFile` + `writeFile` cycle on `.git/index` with `fs.promises.utimes` (`safeTouchFile`), avoiding file content truncation or race conditions during GitLens blame cache invalidation.

- **GitLens Guard**: Avoids touching `.git/index` if the GitLens extension (`eamodio.gitlens`) is not installed or active.

- **Debounced Git/GitLens Invalidation**: Consolidated consecutive git and GitLens cache flushes into a single debounced timer (100ms).

- **Network Telemetry IP Sanitization**: Extended telemetry PII scrubber to redact IPv4 addresses and port combinations to `<IP_REDACTED>`.

- **Server Startup Error Recovery**: Ensured `getServerInfo()` clears rejected promises on failure so subsequent user retry attempts re-invoke server startup rather than caching failures.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `extension.ts`: Initialized host security environment on activation via `initializeHostSecurityEnvironment()`.
  - `server_manager.ts`: Added `resolveSystemCaBundlePath()` scanning platform CA bundles (`LINUX_SYSTEM_CA_PATHS`, `MACOS_SYSTEM_CA_PATH`); added `initializeHostSecurityEnvironment()`; added `buildServerEnvironment()` propagating proxy settings and SSL environment flags (`NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `NODE_USE_SYSTEM_CA`).
  - `desktop_webview_delegate.ts`: Redesigned loading template with `ANTIGRAVITY_LOGO_SVG`, `LOADING_COMMON_CSS`, `getLoadingContentHtml()`, progress bar keyframe animation, and 10-second safety fallback.
  - `telemetry_service.ts`: Added regex to scrub IPv4 addresses with optional ports (`<IP_REDACTED>`).

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `diff_zones/diff_zone_renderer.ts`: Added `acceptFocusedHunk(fileUri)`, `rejectFocusedHunk(fileUri)`, and `revealDocument(fileUri, preview)` to `DiffZoneRenderer` interface.
  - `diff_zones/inline_diff_zone_renderer.ts`: Implemented `acceptFocusedHunk` and `rejectFocusedHunk`, locating cursor line inside active diff ranges.
  - `diff_zones/side_by_side_diff_zone_renderer.ts`: Implemented `revealDocument(fileUri, preview)` with `vscode.diff`.
  - `diff_zones/agent_edit_manager.ts`: Added `handleAcceptFocusedHunk` and `handleRejectFocusedHunk`; integrated `revealDocument`; used `toJetskiFileUri`.
  - `diff_zones/inline_diff_manager.ts`: Replaced index rewrite with `safeTouchFile` (`fs.promises.utimes`); added `isGitLensActive()`; added `gitRefreshTimeout` debouncer.
  - `diff_zones/utils.ts`: Integrated `toCiderWebclientUri` into `normalizeUri`.
  - `extension_api.ts`: Registered prioritized commands (`agentFocusNextHunk`, `agentFocusPreviousHunk`, `agentAcceptFocusedHunk`, `agentRejectFocusedHunk`, `agentAcceptAllInFile`, `agentRejectAllInFile`); added `updateHunkContext()` publishing `antigravity.canAcceptOrRejectFocusedHunk` and `antigravity.canAcceptOrRejectAllAgentEditsInFile`; added worktree URI translation via `workspaceManager.resolveFileUri()`; handled `ConnectError.NotFound` in `setContextCategories`.
  - `editor_state_watcher.ts`: Normalized document URIs with `toJetskiFileUri`; caught `ConnectError.NotFound` in `setEditorState`.
  - `extensionutils/workspace.ts`: [NEW] Modular workspace URI translation (`parseWorkspaceRootUri`, `getRemoteWorkspaceInfo`, `toCiderWebclientUri`, `toJetskiFileUri`, `getResourceFromWorkspacePath`).
  - `webclient/workspace/ids.ts`: [NEW] VCS workspace identity mapping (`workspaceIdToCitcId`, `workspaceIdToPiperId`, `workspaceIdToVcsId`, `workspaceIdToString`) supporting `PIPER`, `FIG`, `COG`, `JJ`, `REMOTE`.
  - `setup/cider_host_management.ts`: Added remote host awareness via `getRemoteWorkspaceInfo()`.
  - `webview_renderer.ts`: Cached `serverInfo` to skip duplicate `renderLoading()` during secondary view registration (b/558282887); cleared cached state on failure.
  - `jetski_instance.ts`: Added `show({ preserveFocus })`.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - Reconstructed 911 Google3 Piper monorepo modules (518 Closure, 393 CJS), adding 20 new files.
  - New Schemas & Modules:
    - `SubagentDescriptor`, `SubagentMetadata`, `SubagentSpec`, `SubagentResult`, `CortexStepInvokeSubagent` under `third_party/jetski/cortex_pb/`.
    - `WorkspaceId` (`jspb$b$WorkspaceId.js`, `jspb$m$WorkspaceId.js`, `jspb$o$WorkspaceId.js`, etc.) under `blaze-out/.../devtools/sourcerers/workspace/`.
    - `PluginMcpUserConfig` (`jspb$b$PluginMcpUserConfig.js`, `jspb$m$PluginMcpUserConfig.js`, `jspb$o$PluginMcpUserConfig.js`) under `third_party/jetski/config_pb/`.
    - Vendored VS Code base runtime modules under `third_party/antigravity/src/vs/base/common/` (`uri.ts`, `path.ts`, `extpath.ts`, `marshallingIds.ts`, `network.ts`, `platform.ts`, `process.ts`, `resources.ts`, `nls.ts`).
  - Updated Schemas:
    - `cortex_pb.ts`: Added `SubagentState` enum (`UNSPECIFIED = 0`, `ALIVE = 1`, `KILLED = 2`).
    - `codeium_common_pb.ts`: Added models 1317–1323 (`gemini-3.8-flash-cyber`, `gemini-3.8-flash-high`, `gemini-3.8-flash-medium`, `gemini-3.8-flash-low`, `gemini-3.8-flash (Cyber Permissive)`, `gemini-3.8-flash-tiered`, `abc-hillclimbing-tf`); added `Source` and `GroundingMetadata` messages; added `media_id` (field 9) to `Media`.
    - `iframe_messages_pb.ts`: Added `UserThemePreferenceChangeMessage` and `UserThemePreferenceChangeResponse` with `UserThemePreference` enum.
    - `config_pb`: Added `mcp` map (field 3) to `PluginUserConfig`.
    - `jetbox_state_pb`: Added `vertex_service_tier` (field 46) to `UserSettings`.
    - `closure/net/xhrio.js` & `xmlhttpfactory.js`: Added `RequestInit` and `FetchXmlHttpFactory` parameter support.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `bridge.js`: Normalized runtime (988 diff lines), updated protobuf descriptors (`codeium_common.proto`, `cortex.proto`, `iframe_messages.proto`, `config.proto`, `workspace_id.proto`) and bindings (`SubagentDescriptor`, `SubagentMetadata`, `GroundingMetadata`, `Source`, `PluginMcpUserConfig`, `WorkspaceId`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_DEPOT_PATH`: `//depot/google3`
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.09.02-1 (mainline @974746007)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.3.0_RC01`
  - `BUILD_HOSTNAME`: `ovo11.prod.google.com`

---

## [v1.2.1] - 2026-09-08

### Webview compatibility and prototype isolation
Webview message serialization is now scoped strictly to Antigravity views, eliminating prototype mutation conflicts with third-party extensions like GitLens. This patch also adds direct pass-through support for binary ArrayBuffer payloads.

### Highlights
- **Third-Party Webview Compatibility & Prototype Isolation**: Scoped webview message serialization directly to the Antigravity webview instance, preventing global prototype mutation that affected third-party extension webviews (such as GitLens).

- **Binary Webview Message Support**: Added direct pass-through for `ArrayBuffer` and typed array views (`ArrayBuffer.isView`) in webview IPC, avoiding destructive JSON stringification of binary payloads.

### Fixes
- **Third-Party Extension Webview Interference**: Removed global `Object.getPrototypeOf(webview)` prototype patching in `desktop_webview_delegate.ts`. Webview patching for BigInt serialization is now applied strictly to the individual Antigravity webview instance, eliminating side effects on other extensions sharing the VS Code Webview prototype.

- **Binary Message Serialization**: Guarded `postMessage` JSON serialization against `ArrayBuffer` and `ArrayBufferView` payloads, ensuring binary buffers are forwarded untouched rather than mangled by `JSON.stringify`.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `desktop_webview_delegate.ts`:
    - Refactored `patchWebviewPostMessage(webview)` to eliminate prototype-level mutation (`Object.getPrototypeOf(webview)`).
    - Inlined instance-level patching with safety check (`typeof webview.postMessage !== 'function'`) and idempotency guard (`extendedWebview._patchedForBigInt`).
    - Added fast-path bypass for binary messages (`ArrayBuffer.isView(message) || message instanceof ArrayBuffer`) before JSON BigInt stringification.

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_DEPOT_PATH`: `//depot/branches/antigravity_vscode_extension_release_branch/974744555.1/google3`
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.08.18-1 (mainline @965897722)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.2.1_RC02`
  - `BUILD_HOSTNAME`: `lman20.prod.google.com`

---

## [v1.2.0] - 2026-09-03

### Status bar integration, GitLens cache sync, and settings tab deduplication
A dedicated status bar item now gives one-click access to Antigravity and Jetski configuration panels. This release also syncs GitLens blame cache invalidation on accepted diffs and prevents duplicate Settings and Artifact tabs across split editors.

### Highlights
- **Status Bar Integration & Settings Command**: Introduced a dedicated status bar button (`Antigravity - Settings`) and registered the `antigravity.openSettings` command for direct access to Antigravity and Jetski configuration panels with screen targeting.

- **Git & GitLens Deep Integration**: Added automatic GitLens blame cache invalidation (via `.git/index` mtime updates) and `git.refresh` synchronization upon diff resolution, ensuring new and accepted agent edits appear as uncommitted working changes rather than attributing lines to historical commits.

- **Custom Editor Tab Deduplication**: Resolved editor tab duplication for both Settings (`jetski-settings://global`) and Artifacts (`jetski-artifact://`) across split editor groups, transitioning to canonical queryless URIs and in-place webview navigation.

- **Configurable Server Port & Process Crash Telemetry**: Added `antigravity.serverPort` configuration to allow binding fixed ports, alongside comprehensive `SERVER_CRASH` telemetry tracking unexpected process terminations, signals, and spawn failures.

### Improvements
- **Status Bar Item**: Added a persistent, right-aligned status bar item (`Antigravity - Settings`) linking directly to settings.

- **Customizable Server Port**: Added `antigravity.serverPort` setting (default `0` for ephemeral port allocation) with automatic window reload prompting on change.

- **Auto-Open Agent Edits**: Added native `antigravity.autoOpenFiles` setting (with backward compatibility for `jetski-web.autoOpenFiles`) to reveal agent-modified files in the editor.

- **In-Memory Binary Version Cache**: Keyed by SHA-256 file checksums in `binary_downloader.ts`, eliminating redundant `agy --version` child process executions during startup and installation while automatically invalidating if binaries change on disk.

- **Web & Remote Tunnel Connection Overhaul**: Fixed Chrome Private Network Access (PNA) and CORS blocking when connecting from webview host origins (`https://*.vscode-cdn.net`) to local servers (`127.0.0.1`), switching to iframe `load` and `message` event tracking.

- **Platform-Aware Webview Delegate**: Passes `platform` parameter (`web` vs `electron`) based on `vscode.env.uiKind`, enabling webviews to use environment-appropriate clipboard and paste mechanics.

- **Non-Destructive Tab Closure**: Closing a document with active inline diffs now safely unregisters tracking state in memory without reverting or mutating files on disk.

- **Automatic Formatted Content Adoption**: If workspace formatters alter on-disk file content during an agent's turn, the inline diff renderer automatically adopts the on-disk text as `modifiedContents` instead of erroneously failing with "content diverged" read-only diffs.

- **Multi-Step Edit Deduplication**: Improved hunk tracking across multi-turn and same-turn edits by verifying matching `conversationId` and `turnIndex`.

- **Notification Deduplication & Window Focus Awareness**: Deduplicates OS notifications via an in-memory ID cache and suppresses notifications when the window is actively focused on the conversation.

- **New AI Models & Multimodal Options**: Added enum mappings for Gemini Next (model 1260) and internal research models (`gemini-harness-le`, `gdm-safety-tf-2-non-logging`, `gemini-3p7-raw-thoughts`, `gdm-safety-tf-yolo`). Added WebM audio format, `Resolution` tokenization options (`P640X368`, `P368X640`), and `DocsOptions.ImageMode` for embedded document image extraction.

### Fixes
- **Duplicate Settings Tabs**: Prevented duplicate settings tabs from spawning across split editor groups or different navigation routes by checking existing tabs via `findOpenCustomTab` and navigating in-place via `updateActiveSettings`.

- **Duplicate Artifact Tabs**: Canonicalized artifact URIs by stripping URL fragments, caching `cascadeId` per file path in memory, and focusing existing custom editor tabs across all editor groups.

- **Premature Edit Acceptance on New Chat**: Fixed an issue where transitioning from `/` to `/c/<id>` upon starting a new chat prematurely auto-accepted pending edits before user review.

- **Non-Git Workspace Modal Dialog Fix**: Guarded `git.refresh` calls with `hasOpenGitRepositories()`, preventing VS Code's Git extension from throwing modal warning dialogs ("Git: There are no available repositories") in Google3/CitC or non-Git workspaces.

- **GitLens Blame Desynchronization**: Touched `.git/index` mtime upon diff resolution (handling worktrees and submodules) to flush GitLens in-memory blame caches.

- **CodeLens UI Thrashing**: Debounced inline diff CodeLens refreshes with a 250ms timer to eliminate visual flickering during rapid edits.

- **Server Crash & Process Telemetry**: Added structured logging for `SERVER_CRASH` capturing `exit_code`, termination signals, and sanitized error stacks, while suppressing false-positive crashes during intentional extension deactivation.

- **Enhanced Telemetry PII Scrubbing**: Integrated `stacktrace_parser` to sanitize stack traces down to file basenames and line numbers, while scrubbing home directory paths across Windows, macOS, and Linux to `<USER_DIR>`.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `status_bar.ts`: [NEW] Registered right-aligned status bar item (`Antigravity - Settings`) and `antigravity.openSettings` command delegating to `SettingsEditorProvider`.
  - `extension.ts`: Registered status bar item during activation; added `onDidChangeConfiguration` listener for `antigravity.serverPort` with window reload confirmation.
  - `server_manager.ts`: Added `isStopping` intentional-shutdown flag; read `antigravity.serverPort` from configuration; added `getAvailableEphemeralPort()`; wired `SERVER_CRASH` event logging on process exit and spawn error; added `exit_code` and sanitized stack traces to `SERVER_START_FAILURE`.
  - `binary_downloader.ts`: Added `binaryVersionCache` Map keyed on SHA-256 checksums; added `clearBinaryVersionCache()`; increased version command timeout to 5000ms; updated extension version resolution via `context?.extension?.packageJSON?.version`.
  - `desktop_webview_delegate.ts`: Added `platform` query parameter (`web` / `electron`) based on `vscode.env.uiKind`; replaced raw `fetch` loopback polling with iframe `load`/`message` event tracking (`revealIframe`); applied flex column centering for `.container`.
  - `telemetry_service.ts`: Integrated `stacktrace_parser` for frame path sanitization; added PII filters for user home directories (`<USER_DIR>`) and URL parameters (`<REDACTED_PARAMS>`); mapped `exit_code`, `exitCode`, `error_code`, `errorCode`, `error_message`, and `failure_reason`.
  - `telemetry_constants.ts`: Added `SERVER_CRASH: "google.antigravity.vscode.extension.server.crash"`.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `diff_zones/inline_diff_manager.ts`: Added `refreshGitAndGitLens()` with `hasOpenGitRepositories()` guard; added `touchGitIndexForUri()` supporting worktree/submodule `gitdir:` resolution; added `debouncedRefreshCodeLenses()` (250ms); eliminated destructive `rejectRemaining` on document tab close; synchronized `antigravity.hasActiveDiff` context key across all files.
  - `diff_zones/agent_edit_manager.ts`: Added `isAutoOpenEnabled()` supporting `antigravity.autoOpenFiles` and `jetski-web.autoOpenFiles`; implemented automatic on-disk content divergence adoption for formatted files; enhanced `handleExistingDiffZone` to recognize `isSameTurn`.
  - `extension_api.ts`: Implemented tab deduplication and in-place navigation in `openSettings` and `openArtifact` via `findOpenCustomTab` and `revealOpenCustomTab`; guarded concurrent tab opens via `pendingOpenSettingsPromise` and `pendingOpenArtifacts`; updated `notifyPathChange` to prevent auto-accepting edits on initial `/` to `/c/<id>` navigation; added bounded `sentNotificationIds` cache (50 entries) and focused-window suppression in `showBrowserNotification`.
  - `settings_editor_provider.ts`: Added `setPendingOptions()`, `updateActiveSettings()`, and `activePanel` lifecycle tracking.
  - `artifact_editor_provider.ts`: Added `cascadeIdByPath` Map and `setCascadeIdForPath()`.
  - `core_activation.ts`: Instantiated singletons for `ArtifactEditorProvider` and `SettingsEditorProvider` shared with `ExtensionApiImpl`.
  - `webview_provider.ts`: Synchronized `lastConversationId` into `workspaceState`.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - Reconstructed 891 Google3 Piper monorepo modules (507 Closure, 384 CJS), adding 4 new files.
  - New Schemas: `google.protobuf.Any` (`jspb$b$Any.js`, `jspb$m$Any.js`, `jspb$o$Any.js` under `google/protobuf/any_jspb/`).
  - Relocated Schemas: Relocated `MarketplaceInstall` from `third_party/jetski/config_pb` to `third_party/jetski/cortex_pb` (`cortex_jspb/`) to resolve layering constraints for provenance surfacing.
  - Updated Schemas:
    - `BlueprintBinding`: Deprecated `paramsMap` (field 2); added `user_config` (field 4, `google.protobuf.Any`).
    - `ListDeploymentsRequest`: Added `filter` (field 4, string).
    - `MemoryConfig`: Added `release_track` (field 7, `ReleaseTrack` enum).
    - `UserSettings`: Deprecated `enable_personal_customizations` (field 38).
    - `cortex_pb.ts`: Added `SidecarStatus.STARTING = 5`; updated message schemas following `MarketplaceInstall` insertion.
    - `content_pb.ts`: Added `AudioContent.MimeType.TYPE_WEBM = 15`; replaced `FunctionContent` with `Function` message and `Function.Behavior` enum (`UNSPECIFIED = 0`, `BLOCKING = 1`, `NON_BLOCKING = 2`).
    - `processing_options_pb.ts`: Added `WorkspaceOptions.DocsOptions.ImageMode` enum (`IMAGE_MODE_UNSPECIFIED = 0`, `EMBEDDED_IMAGES_ONLY = 1`).
    - `resolution_pb.ts`: Added `Resolution.RESOLUTION_P640X368 = 8` and `Resolution.RESOLUTION_P368X640 = 9`.
    - `hooks_pb.ts`: Added `agent_name` (field 9, string) to `HookArgsCommon`.
    - `codeium_common_pb.ts`: Added models 1260 (`Gemini Next`), 1313 (`gemini-harness-le`), 1314 (`gdm-safety-tf-2-non-logging`), 1315 (`gemini-3p7-raw-thoughts`), 1316 (`gdm-safety-tf-yolo`).
    - `constants.ts` (DataCloud): Added `AUTH_METHOD: "authMethod"`.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `bridge.js`: Normalized and signature-stripped runtime (1,048 diff lines), updated protobuf descriptors (`hooks.proto`, `cortex.proto`, `content.proto`, `resolution.proto`, `processing_options.proto`) and enum bindings (`SidecarStatus`, `AudioContent_MimeType`, `Function_Behavior`, `DocsOptions_ImageMode`, `Resolution`).

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.08.18-1 (mainline @965897722)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.2.0_RC00`
  - `BUILD_HOSTNAME`: `lmbgv8.prod.google.com`

---

## [v1.1.0] - 2026-08-27

### Resilient server recovery, inline diff viewport auto-scrolling, and Permissions V2
Recover seamlessly from network hiccups with exponential backoff download retries and an interactive webview retry screen. This release also auto-scrolls your editor to remaining diff hunks upon accept/reject and adds foundational Permissions V2 schemas.

### Highlights
- **Resilient Server Startup & Recovery**: Introduced exponential backoff retry loops and an interactive in-webview recovery state with a manual "Retry" action, preventing extension crashes during network dropouts or backend server installation issues.

- **Enhanced Inline Diff Navigation**: Added automatic viewport scrolling and cursor advancement to remaining hunks upon accept/reject, plus relative navigation (`next` / `previous`) across inline diffs.

- **Permissions V2 & Skills Foundation**: Added core protobuf schemas and client state models for Permissions V2, security plugin settings, conversation grouping, and custom skill configurations.

### Improvements
- **Interactive Startup Recovery**: When local server startup or binary acquisition fails, the webview displays a themed error screen with actionable diagnostics and a "Retry" button.

- **Next-Hunk Auto-Advancement**: Accepting or rejecting an inline diff hunk now automatically reveals and focuses the next remaining hunk in the editor.

- **Relative Diff Hunk Navigation**: Added `focusHunk` with support for `'next'` and `'previous'` relative navigation respecting active cursor line positions.

- **Auto-Open Edited Files**: Added support for `jetski-web.autoOpenFiles` setting to automatically reveal agent-modified files in the editor.

- **Notebook Diff Invalidation**: Forcing on-disk reloads for dirty notebooks via `AntigravityFiles.forceResolveFromFile` prior to computing inline diff zones.

- **Host Page Reload Protocol**: Added `ReloadRequestMessage` allowing webview and standalone PWA instances to request a parent page reload when recovering wedged sessions.

- **Location-Aware Webview Themes**: Loading and error views now automatically match the background and foreground colors of their specific host container (`sideBar` vs editor tab).

- **New AI Models & Multimodal Options**: Added enum definitions for internal Gemini variants (`gemini-tl-test-high`, `medium`, `low`) and millisecond precision options for interleaved modality verbalization.

### Fixes
- **Binary Downloader Exponential Backoff**: Download pipelines and manifest lookups now automatically retry transient network drops up to 3 times with exponential backoff, while failing fast on non-retryable 4xx client errors.

- **Corrupt Binary Cleanup**: Automatically unlinks and re-downloads staging files if SHA-256 checksum verification fails.

- **Date-Based SemVer Normalization**: Stripped leading zeros in date-based version numbers (e.g. `2026.08.24`) to avoid SemVer parsing errors during version checks.

- **Empty Protobuf Key Filter Fix**: Fixed `ExtensionApiImpl.globalStorageGet` to treat empty repeated protobuf key arrays as unfiltered requests.

- **Structured Server Error Classification**: Categorized backend launch errors into structured error types (`timeout`, `binary_not_found`, `permission_denied`, `download_failed`, `spawn_failed`, `unexpected_failure`) for telemetry.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `binary_downloader.ts`: Added `HttpError` error class, `withRetry` with `DEFAULT_RETRY_OPTIONS` (exponential backoff), SHA-256 verification retry wrapper, and leading-zero normalization in `isVersionAtLeast`.
  - `server_manager.ts`: Added `ServerStartOptions` interface, server launch telemetry (`SERVER_START`, `SERVER_START_SUCCESS` with `duration_ms`, `SERVER_START_FAILURE` with `failure_reason`), and `categorizeServerStartError`.
  - `extension.ts`: Refactored `desktopSetup` into a `while (!serverUrl)` recovery loop awaiting user interaction via `messageNotifier.onRetry()`.
  - `desktop_webview_delegate.ts`: Updated `renderLoading` with dynamic location theme variables (`--vscode-agy-background`, `--vscode-agy-foreground`), `.retry-btn` button, and structured `#loading-error` container.
  - `telemetry_service.ts`: Added duration key aliases (`duration_ms`, `durationMs`, `duration`) mapping to `CommonMetadataKey.DURATION_MS`.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `diff_zones/inline_diff_manager.ts`: Added `focusNextHunk(uriStr, index)` to auto-advance editor viewport and selection after hunk resolution.
  - `diff_zones/inline_diff_zone_renderer.ts`: Added `focusHunk(fileUri, target)` supporting `'next'`, `'previous'`, and direct numeric indexes.
  - `diff_zones/agent_edit_manager.ts`: Integrated `jetski-web.autoOpenFiles` setting, called `AntigravityFiles.forceResolveFromFile` for notebooks, and recorded remaining hunk resolutions on batch completion (`event.final`).
  - `diff_zones/utils.ts`: Added `findEditorForUri(fileUri)` resolving across `activeTextEditor` and `visibleTextEditors`.
  - `extension_api.ts`: Fixed `request.keys` empty check to support ConnectRPC empty arrays in `globalStorageGet`.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - Reconstructed 887 Google3 Piper monorepo modules (506 Closure, 381 CJS), adding 21 new schema files.
  - New Schemas: `ConversationGroupConfig`, `ConversationGroupRegistry`, `SkillUserConfig`, `MarketplaceInstall`, `SecurityPluginSettings` (`.Cli`, `.Vetted`).
  - Updated Schemas:
    - `UserConfig`: Added `conversation_groups` (field 4) and `skills` map (field 5).
    - `PluginUserConfig`: Added `installed_from` (field 2, `MarketplaceInstall`).
    - `ProjectSettings`: Added `security_plugins` map (field 9); deprecated `enable_permissioned_github` (field 6).
    - `UserSettings`: Added `permission_grants_v2_migrated` (field 44) and `sandbox_enabled_at_v2_migration` (field 45).
    - `PermissionGrants`: Added `v2_migrated` (field 3).
    - `DeploymentConfig`: Added `enable_control_plane_monitoring` (field 31).
    - `MemoryMountConfig`: Deprecated `eager_cache_warming` (field 4).
    - `Project`: Deprecated `updated_at` (field 11).
    - `cortex_pb.ts`: Deprecated `MessageConfig`; added `ToolOutputConfig` and `ToolOutputConfigSchema` (field 168); extended `CascadeToolConfig` (Next ID: 57).
    - `jetski_cortex_pb.ts`: Added `HookStatus` and `HookStatusSchema` (field 5).
    - `iframe_messages_pb.ts`: Added `ReloadRequestMessage` and `ReloadRequestMessageSchema` (field 35).
    - `codeium_common_pb.ts`: Added models 1307-1312 and `CASCADE_NUX_TRIGGER_PERMISSIONS_V2_ENABLED = 16`.
    - `verbalization_options_pb.ts`: Added `VerbalizationSchema.ModalityInterleavingOptions` with `TimestampPrecision` enum.

- **Webview Bridges (`extension/bridge.js`, `extension/loading_bridge.js`)**:
  - `bridge.js`: Normalized and signature-stripped runtime (5,129 diff lines), integrating Permissions V2 interaction specs (`BlockReason.OUTSIDE_WORKSPACE`, `BlockReason.GITIGNORED`, `TriggerSource.CROSS_PROJECT_ISOLATION`), `ReloadRequestMessage` support, and skill user configs.

- **Build Metadata (`extension/package.json`)**:
  - `BUILD_BLAZE_RELEASE`: `release blaze-2026.08.11-3 (mainline @962449167)`
  - `BUILD_EMBED_LABEL`: `antigravity_vscode_extension_1.1.0_RC00`
  - `BUILD_HOSTNAME`: `lfe28.prod.google.com`

---

## [v1.0.0] - 2026-08-20

### Initial release of Google Antigravity for VS Code
Google Antigravity for Visual Studio Code brings Google's agent-first AI development platform directly into your editor, featuring local language server lifecycle management, real-time inline diffs, and a responsive webview chat sidebar.

### Highlights
- **Initial Public Release**: Google Antigravity for Visual Studio Code brings Google's agent-first AI development platform directly into the VS Code editor.

### Improvements
- **Antigravity Language Server Integration**: Automated lifecycle management, downloading, and background execution of local Antigravity server processes.

- **Agent Edit Manager & Inline Diffs**: Real-time inline diff zone rendering and side-by-side diff reviews powered by Google Jetski.

- **Interactive Webview Sidebar**: Low-latency webview interface (`bridge.js`) featuring real-time chat, conversation management, and VS Code theme synchronization.

- **Workspace Navigation**: Support for changing workspaces and synchronizing conversation state across sessions.

### Fixes
- Baseline launch release.

---

### Under the Hood
*This section documents exact Google3 monorepo changes, schemas, and build revisions.*

- **Core & Lifecycle (`extension/src/cloud/...`)**:
  - `extension.ts`: Main activation entry point with `desktopSetup`, telemetry binding, and command registrations (`antigravity.openAgentUi`, `antigravity.changeWorkspace`, `antigravity.openSettings`).
  - `server_manager.ts`: Process management and port binding for local Antigravity server instances.
  - `binary_downloader.ts`: Platform-specific binary downloader with checksum validation and extract pipeline.
  - `desktop_webview_delegate.ts`: Bridge communication protocol between the webview and extension host.

- **Jetski & Diff Zones (`extension/src/devtools/cider/...`)**:
  - `diff_zones/inline_diff_zone_renderer.ts`: Inline Monacoe editor diff zones for displaying AI code revisions.
  - `diff_zones/agent_edit_manager.ts`: Multi-file transaction coordinator and hunk storage.

- **Protobuf & IPC Schemas (`extension/src/blaze-out/` & `extension/src/third_party/jetski/`)**:
  - 866 Google3 Piper monorepo modules reconstructed via `extension.js.map`.
  - Core JSPB schemas for Cortex, Chat, Diff Actions, Codeium Common, and Boq Provisioning services.

- **Webview Bridges**:
  - `bridge.js`: Frontend webview runtime normalized and signature-stripped (40,048 formatted lines).
  - `loading_bridge.js`: Lightweight loading spinner bridge normalized and signature-stripped.

- **Build Metadata (`extension/package.json`)**:
  - Blaze release: `release blaze-2026.08.06-4 (mainline @959908470)`
  - Embed label: `antigravity_vscode_extension_1.0.0_RC00`
  - Hostname: `jadk3.prod.google.com`
