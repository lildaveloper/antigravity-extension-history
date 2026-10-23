#!/usr/bin/env node
const path = require('path');
const { findExtensionJs, getExtensionVersion } = require('./core/locator');
const { PatchEngine } = require('./core/engine');

// Target extension version for this patch release
const TARGET_EXTENSION_VERSION = '1.9.0';

// ANSI color formatting
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function formatStatus(statusStr) {
  if (statusStr === 'applied') {
    return `${GREEN}[APPLIED]${RESET}  `;
  } else if (statusStr === 'unpatched') {
    return `${YELLOW}[UNPATCHED]${RESET}`;
  }
  return `${RED}[CONFLICT]${RESET} `;
}

function printStatus(engine, extPath, version) {
  const isTarget = (version === TARGET_EXTENSION_VERSION);
  const versionDisplay = isTarget
    ? `${BOLD}v${version}${RESET} ${GREEN}(Targeted & Verified)${RESET}`
    : `${BOLD}v${version}${RESET} ${YELLOW}(Mismatch: patch set targets v${TARGET_EXTENSION_VERSION})${RESET}`;
  const bakStatus = engine.hasBackup()
    ? `${GREEN}Active (${extPath}.bak)${RESET}`
    : `${CYAN}None (Clean extension)${RESET}`;

  console.log(`\n${BOLD}Google Antigravity Extension Patch Manager${RESET}`);
  console.log(`Target:  ${CYAN}${extPath}${RESET}`);
  console.log(`Version: ${versionDisplay}`);
  console.log(`Backup:  ${bakStatus}\n`);

  const statuses = engine.getStatuses();
  console.log('Available Patches:');
  for (const [patchId, info] of Object.entries(statuses)) {
    const statusTag = formatStatus(info.status);
    console.log(`  ${statusTag} ${BOLD}${patchId.padEnd(18)}${RESET} - ${info.name}`);
    console.log(`                      ${info.description}\n`);
  }
}

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  let action = 'status';
  let patchId = 'all';
  let target = null;

  const positional = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--target' || arg === '-t') {
      target = rawArgs[++i];
    } else if (arg.startsWith('--target=')) {
      target = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    action = positional[0];
  }
  if (positional.length > 1) {
    patchId = positional[1];
  }

  const validActions = ['status', 'apply', 'revert'];
  if (!validActions.includes(action)) {
    console.error(`${RED}Invalid action: ${action}.${RESET} Valid actions: status, apply, revert`);
    process.exit(1);
  }

  return { action, patchId, target };
}

function main() {
  const { action, patchId, target } = parseArgs();

  let extPath;
  try {
    extPath = findExtensionJs(target);
  } catch (err) {
    console.error(`${RED}Error locating extension:${RESET} ${err.message}`);
    process.exit(1);
  }

  const engine = new PatchEngine(extPath);
  const version = getExtensionVersion(extPath);

  if (action === 'status') {
    printStatus(engine, extPath, version);
    return;
  }

  if (action === 'apply') {
    if (version !== TARGET_EXTENSION_VERSION) {
      console.error(`\n${RED}Error: Version mismatch!${RESET}`);
      console.error(`This patch release is strictly targeted and verified for Antigravity Extension ${BOLD}v${TARGET_EXTENSION_VERSION}${RESET}.`);
      console.error(`The detected installed extension is ${YELLOW}v${version || 'unknown'}${RESET}.`);
      console.error(`Upstream code may have changed or resolved these hotfixes. Please audit or update patches for v${version}.\n`);
      process.exit(1);
    }
    try {
      const results = engine.apply(patchId);
      console.log(`\n${BOLD}Applying patch(es):${RESET}`);
      for (const [id, status, msg] of results) {
        if (status === 'applied') {
          console.log(`  ${GREEN}✔${RESET} ${BOLD}${id}${RESET}: ${msg}`);
        } else if (status === 'already_applied') {
          console.log(`  ${CYAN}ℹ${RESET} ${BOLD}${id}${RESET}: ${msg}`);
        } else {
          console.log(`  ${RED}✖${RESET} ${BOLD}${id}${RESET}: ${msg}`);
        }
      }
      console.log(
        `\n${GREEN}✔ Syntax check verified.${RESET} Reload VS Code window (\`Cmd+Shift+P\` -> Developer: Reload Window) to activate.\n`
      );
    } catch (err) {
      console.error(`\n${RED}Error applying patch:${RESET} ${err.message}\n`);
      process.exit(1);
    }
  } else if (action === 'revert') {
    try {
      if (!engine.hasBackup()) {
        console.log(
          `\n${CYAN}ℹ${RESET} Extension is already in its original unpatched state (no backup file found).\n`
        );
        return;
      }
      engine.revert();
      console.log(`\n${GREEN}✔ Restored extension.js from backup.${RESET}`);
      console.log(
        `${GREEN}✔ Syntax check verified.${RESET} Reload VS Code window (\`Cmd+Shift+P\` -> Developer: Reload Window) to activate.\n`
      );
    } catch (err) {
      console.error(`\n${RED}Error reverting:${RESET} ${err.message}\n`);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
