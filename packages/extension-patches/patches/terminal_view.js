/**
 * Patch: Enable Standalone Terminal for Background Tasks
 * ID: terminal_view
 *
 * Fixes the issue where clicking running background task cards in chat fails to
 * display the terminal stream because jetski.terminalView is not registered as a
 * bottom panel view container in standard VS Code.
 */

const ID = 'terminal_view';
const NAME = 'Enable Standalone Terminal for Background Tasks';
const DESCRIPTION = 'Renders interactive terminal output for background tasks in an editor tab when the Cider panel is unavailable.';

const TARGET_1 = `b(await c(this.terminalPanelProvider.showTerminal(a)));b(await c(n.commands.executeCommand("jetski.terminalView.focus")))`;

const REPLACEMENT_1 = `b(await c(this.terminalPanelProvider.showTerminal(a)));this.terminalPanelProvider.view&&b(await c(n.commands.executeCommand("jetski.terminalView.focus")))`;

const TARGET_2 = `this.view&&(this.view.show(!0),b(await c(this.renderWebview())))`;

const REPLACEMENT_2 = `this.view?(this.view.show(!0),b(await c(this.renderWebview()))):(this.panel||(this.panel=n.window.createWebviewPanel("jetski.terminalPanel","Antigravity Terminal",n.ViewColumn.Beside,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[this.context.extensionUri]}),this.panel.onDidDispose(()=>{this.panel=void 0})),this.panel.reveal(n.ViewColumn.Beside),b(await c(this.renderer.renderJetskiIframe(this.panel,{targetRoute:"terminal-standalone",extraParams:\`&conversationId=\${encodeURIComponent(a.conversationId)}&stepIndex=\${a.stepIndex}\`,type:"terminal",location:"editor"}))))`;

const REPLACEMENTS = [
  [TARGET_1, REPLACEMENT_1],
  [TARGET_2, REPLACEMENT_2],
];

module.exports = {
  ID,
  NAME,
  DESCRIPTION,
  REPLACEMENTS,
};
