#!/usr/bin/env node

/**
 * electron-aaos-pro CLI
 *
 * Thin CLI wrapper for @electron-aaos-fullstack/pro.
 * Provides a clean npx interface: npx electron-aaos-pro install
 *
 * Commands:
 *   install             Install @electron-aaos-fullstack/pro in the current project
 *   activate --key X    Activate a license key
 *   deactivate          Deactivate the current license
 *   status              Show license status
 *   features            List available pro features
 *   validate            Force online license revalidation
 *   help                Show help
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PRO_PACKAGE = '@electron-aaos-fullstack/pro';
const VERSION = require('../package.json').version;

const args = process.argv.slice(2);
const command = args[0];

// ─── Helpers ────────────────────────────────────────────────────────────────

function run(cmd, options = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    cwd: process.cwd(),
    ...options,
  });
  return result.status;
}

function isProInstalled() {
  try {
    const pkgPath = path.join(process.cwd(), 'node_modules', '@electron-aaos-fullstack', 'pro', 'package.json');
    return fs.existsSync(pkgPath);
  } catch {
    return false;
  }
}

function findAiosCli() {
  // Check local node_modules first
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', 'electron-aaos');
  if (fs.existsSync(localBin) || fs.existsSync(localBin + '.cmd')) {
    return 'npx electron-aaos';
  }

  // Check global
  try {
    execSync('electron-aaos --version', { stdio: 'pipe' });
    return 'electron-aaos';
  } catch {
    return null;
  }
}

function delegateToAios(subcommand) {
  const electron-aaos = findAiosCli();
  if (!electron-aaos) {
    console.error('electron-aaos-core CLI not found.');
    console.error('Install it first: npm install electron-aaos-core');
    process.exit(1);
  }

  const spawnArgs = ['pro', subcommand, ...args.slice(1)];
  const result = spawnSync(electron-aaos, spawnArgs, { stdio: 'inherit' });
  process.exit(result.status ?? 0);
}

// ─── Commands ───────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
electron-aaos-pro v${VERSION} — Electron AAOS Pro CLI

Usage:
  npx electron-aaos-pro <command> [options]

Commands:
  install              Install ${PRO_PACKAGE} in the current project
  activate --key KEY   Activate a license key
  deactivate           Deactivate the current license
  status               Show license status
  features             List available pro features
  validate             Force online license revalidation
  help                 Show this help message

Examples:
  npx electron-aaos-pro install
  npx electron-aaos-pro activate --key PRO-XXXX-XXXX-XXXX-XXXX
  npx electron-aaos-pro status

Documentation: https://electron-aaos.ai/pro/docs
`);
}

function installPro() {
  console.log(`\nInstalling ${PRO_PACKAGE}...\n`);

  const exitCode = run(`npm install ${PRO_PACKAGE}`);

  if (exitCode !== 0) {
    console.error(`\nFailed to install ${PRO_PACKAGE}`);
    process.exit(1);
  }

  console.log(`\n✅ ${PRO_PACKAGE} installed successfully!\n`);
  console.log('Next steps:');
  console.log('  npx electron-aaos-pro activate --key PRO-XXXX-XXXX-XXXX-XXXX');
  console.log('  npx electron-aaos-pro status');
  console.log('');
}

// ─── Main ───────────────────────────────────────────────────────────────────

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(`electron-aaos-pro v${VERSION}`);
  process.exit(0);
}

switch (command) {
  case 'install':
  case 'setup':
    installPro();
    break;

  case 'activate':
  case 'deactivate':
  case 'status':
  case 'features':
  case 'validate':
    if (!isProInstalled()) {
      console.error(`${PRO_PACKAGE} is not installed.`);
      console.error('Run first: npx electron-aaos-pro install\n');
      process.exit(1);
    }
    delegateToAios(command);
    break;

  default:
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
}
