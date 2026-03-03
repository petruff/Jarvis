#!/usr/bin/env node

/**
 * Electron AAOS-FullStack Installation Wizard v5 (LEGACY)
 * Based on the original beautiful visual design with ASCII art
 * Version: 2.1.0
 *
 * ⚠️ DEPRECATED (since v3.11.3, scheduled for removal in v5.0.0):
 * This file is the LEGACY installer.
 * The new modular wizard is located at: packages/installer/src/wizard/index.js
 *
 * This file is kept as a fallback for edge cases where the new wizard
 * is not available. All new development should use the new wizard.
 *
 * Migration path:
 * - Use `npx electron-aaos-core` which routes through bin/electron-aaos.js to the new wizard
 * - Do NOT call this file directly
 *
 * Supported IDEs (7 total):
 * - Claude Code, Cursor, Windsurf, Roo Code, Cline, Gemini CLI, GitHub Copilot
 */

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const { execSync } = require('child_process');
const inquirer = require('inquirer');
const chalk = require('chalk');

// ASCII Art Banner (Clean blocky style like reference image)
const BANNER = chalk.cyan(`
  █████╗ ██╗ ██████╗ ███████╗      ███████╗██╗   ██╗██╗     ██╗     ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ██╔══██╗██║██╔═══██╗██╔════╝      ██╔════╝██║   ██║██║     ██║     ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
 ███████║██║██║   ██║███████╗█████╗█████╗  ██║   ██║██║     ██║     ███████╗   ██║   ███████║██║     █████╔╝
 ██╔══██║██║██║   ██║╚════██║╚════╝██╔══╝  ██║   ██║██║     ██║     ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
 ██║  ██║██║╚██████╔╝███████║      ██║     ╚██████╔╝███████╗███████╗███████║   ██║   ██║  ██║╚██████╗██║  ██╗
 ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝      ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`);

const SUBTITLE = chalk.magenta('Universal AI Agent Framework for Any Domain');
// Read version from package.json dynamically
const packageJsonVersion = require(path.join(__dirname, '..', 'package.json')).version;
const VERSION = chalk.yellow(`Installer v${packageJsonVersion}`);

/**
 * Smart path resolution for Electron AAOS Core modules
 */
function resolveAiosCoreModule(modulePath) {
  const electron-aaosCoreModule = path.join(__dirname, '..', '.electron-aaos-core', modulePath);

  const moduleExists =
    fs.existsSync(electron-aaosCoreModule + '.js') ||
    fs.existsSync(electron-aaosCoreModule + '/index.js') ||
    fs.existsSync(electron-aaosCoreModule);

  if (!moduleExists) {
    throw new Error(
      `Cannot find Electron AAOS Core module: ${modulePath}\n` +
        `Searched: ${electron-aaosCoreModule}\n` +
        'Please ensure @electron-aaos/electron-aaos-core is installed correctly.'
    );
  }

  return require(electron-aaosCoreModule);
}

// Load Electron AAOS Core modules
const { detectRepositoryContext } = resolveAiosCoreModule(
  'infrastructure/scripts/repository-detector'
);
// PM adapters imported but not used directly (loaded dynamically)
// const { ClickUpAdapter } = resolveAiosCoreModule('utils/pm-adapters/clickup-adapter');
// const { GitHubProjectsAdapter } = resolveAiosCoreModule('utils/pm-adapters/github-adapter');
// const { JiraAdapter } = resolveAiosCoreModule('utils/pm-adapters/jira-adapter');

// Brownfield upgrade module (Story 6.18)
let brownfieldUpgrader;
try {
  brownfieldUpgrader = require('../packages/installer/src/installer/brownfield-upgrader');
} catch (_err) {
  // Module may not be available in older installations
  brownfieldUpgrader = null;
}

async function main() {
  console.clear();

  // Check for minimal mode flag
  const isMinimalMode = process.argv.includes('--minimal');

  // Display beautiful banner
  console.log(BANNER);
  console.log(SUBTITLE);
  console.log(VERSION);
  if (isMinimalMode) {
    console.log(chalk.yellow('   🔹 Minimal Installation Mode'));
  }
  console.log('');
  console.log(chalk.gray('═'.repeat(80)));
  console.log('');

  const projectRoot = process.cwd();
  let context = detectRepositoryContext();

  // Setup prerequisites if needed
  if (!context) {
    console.log(chalk.blue('⚙️  Setting up project prerequisites...\n'));

    // Check for git repository
    let hasGit = false;
    try {
      execSync('git rev-parse --git-dir', { cwd: projectRoot, stdio: 'ignore' });
      hasGit = true;
    } catch (_err) {
      // Not a git repo
    }

    if (!hasGit) {
      try {
        execSync('git init', { cwd: projectRoot, stdio: 'ignore' });
        console.log(chalk.green('✓') + ' Git repository initialized');
      } catch (_err) {
        console.error(chalk.red('✗') + ' Failed to initialize git repository');
        process.exit(1);
      }
    }

    // Check for package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const dirName = path.basename(projectRoot);
      const defaultPackage = {
        name: dirName.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        description: 'Electron AAOS-FullStack project',
        main: 'index.js',
        scripts: { test: 'echo "Error: no test specified" && exit 1' },
        keywords: [],
        author: '',
        license: 'ISC',
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(defaultPackage, null, 2));
      console.log(chalk.green('✓') + ' package.json created');
    }

    console.log(chalk.green('✓') + ' Prerequisites ready\n');

    // Try to detect context again
    context = detectRepositoryContext();

    // If still no context, create minimal one
    if (!context) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      context = {
        projectRoot,
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        repositoryUrl: 'local-repository',
        frameworkLocation: path.join(__dirname, '..'),
      };
    }
  }

  console.log(chalk.cyan('📦 Package:') + ` ${context.packageName}`);
  console.log('');

  // Check for existing installation (Story 6.18 - Brownfield Upgrade)
  const installedManifestPath = path.join(projectRoot, '.electron-aaos-core', '.installed-manifest.yaml');
  const hasExistingInstall = fs.existsSync(installedManifestPath);

  if (hasExistingInstall && brownfieldUpgrader) {
    console.log(chalk.yellow('🔄 Existing Electron AAOS installation detected!'));
    console.log('');

    const sourceDir = path.join(context.frameworkLocation, '.electron-aaos-core');
    const upgradeCheck = brownfieldUpgrader.checkUpgradeAvailable(sourceDir, projectRoot);

    if (upgradeCheck.available) {
      console.log(chalk.green(`   Upgrade available: ${upgradeCheck.from} → ${upgradeCheck.to}`));
      console.log('');

      // Generate upgrade report for display
      const sourceManifest = brownfieldUpgrader.loadSourceManifest(sourceDir);
      const installedManifest = brownfieldUpgrader.loadInstalledManifest(projectRoot);
      const report = brownfieldUpgrader.generateUpgradeReport(
        sourceManifest,
        installedManifest,
        projectRoot
      );

      console.log(chalk.gray('─'.repeat(80)));
      const { upgradeChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'upgradeChoice',
          message: chalk.white('What would you like to do?'),
          choices: [
            {
              name:
                `  Upgrade to ${upgradeCheck.to} ` +
                chalk.gray(
                  `(${report.newFiles.length} new, ${report.modifiedFiles.length} updated files)`
                ),
              value: 'upgrade',
            },
            {
              name: '  Dry Run ' + chalk.gray('(Show what would be changed without applying)'),
              value: 'dry-run',
            },
            {
              name: '  Fresh Install ' + chalk.gray('(Reinstall everything, overwrite all files)'),
              value: 'fresh',
            },
            {
              name: '  Cancel ' + chalk.gray('(Exit without changes)'),
              value: 'cancel',
            },
          ],
        },
      ]);

      if (upgradeChoice === 'cancel') {
        console.log(chalk.yellow('\nInstallation cancelled.'));
        process.exit(0);
      }

      if (upgradeChoice === 'dry-run') {
        console.log('');
        console.log(brownfieldUpgrader.formatUpgradeReport(report));
        console.log('');
        console.log(chalk.yellow('This was a dry run. No files were changed.'));
        console.log(chalk.gray('Run again and select "Upgrade" to apply changes.'));
        process.exit(0);
      }

      if (upgradeChoice === 'upgrade') {
        console.log('');
        console.log(chalk.blue('📦 Applying upgrade...'));

        const result = await brownfieldUpgrader.applyUpgrade(report, sourceDir, projectRoot, {
          dryRun: false,
        });

        if (result.success) {
          // Update installed manifest
          const packageJson = require(path.join(context.frameworkLocation, 'package.json'));
          brownfieldUpgrader.updateInstalledManifest(
            projectRoot,
            sourceManifest,
            `electron-aaos-core@${packageJson.version}`
          );

          console.log(chalk.green('✓') + ` Upgraded ${result.filesInstalled.length} files`);
          if (result.filesSkipped.length > 0) {
            console.log(
              chalk.yellow('⚠') + ` Preserved ${result.filesSkipped.length} user-modified files`
            );
          }
          console.log('');
          console.log(chalk.green('✅ Upgrade complete!'));
          console.log(chalk.gray(`   From: ${upgradeCheck.from}`));
          console.log(chalk.gray(`   To:   ${upgradeCheck.to}`));
          process.exit(0);
        } else {
          console.error(chalk.red('✗') + ' Upgrade failed with errors:');
          for (const err of result.errors) {
            console.error(chalk.red(`   - ${err.path}: ${err.error}`));
          }
          process.exit(1);
        }
      }

      // If 'fresh' was selected, continue with normal installation flow below
      if (upgradeChoice === 'fresh') {
        console.log(chalk.yellow('\nProceeding with fresh installation...'));
        console.log('');
      }
    } else {
      console.log(chalk.green(`   Current version: ${upgradeCheck.from || 'unknown'}`));
      console.log(
        chalk.gray('   No upgrade available. You can proceed with fresh install if needed.')
      );
      console.log('');
    }
  }

  // Step 1: Installation Mode
  console.log(chalk.gray('─'.repeat(80)));
  const { installMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'installMode',
      message: chalk.white('How are you using Electron AAOS-FullStack?'),
      choices: [
        {
          name: '  Using Electron AAOS in a project ' + chalk.gray('(Framework files added to .gitignore)'),
          value: 'project-development',
        },
        {
          name:
            '  Developing Electron AAOS framework itself ' + chalk.gray('(Framework files are source code)'),
          value: 'framework-development',
        },
      ],
    },
  ]);

  // Save installation config
  const config = {
    installation: {
      mode: installMode,
      detected_at: new Date().toISOString(),
    },
    repository: {
      url: context.repositoryUrl,
      auto_detect: true,
    },
    framework: {
      source: installMode === 'framework-development' ? 'local' : 'npm',
      version: context.packageVersion,
      location: context.frameworkLocation,
    },
    git_ignore_rules: {
      mode: installMode,
      ignore_framework_files: installMode === 'project-development',
    },
  };

  const configPath = path.join(context.projectRoot, '.electron-aaos-installation-config.yaml');
  fs.writeFileSync(configPath, yaml.dump(config));

  // Update .gitignore
  updateGitIgnore(installMode, context.projectRoot);

  // Step 2: PM Tool
  console.log('');
  const { pmTool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'pmTool',
      message: chalk.white('Do you use a project management tool?'),
      choices: [
        { name: '  None (local YAML files only) ' + chalk.gray('- Recommended'), value: 'local' },
        { name: '  ClickUp ' + chalk.gray('- Requires API token'), value: 'clickup' },
        { name: '  GitHub Projects ' + chalk.gray('- Uses gh auth'), value: 'github-projects' },
        { name: '  Jira ' + chalk.gray('- Requires API token'), value: 'jira' },
      ],
    },
  ]);

  // Save PM config
  savePMConfig(pmTool, {}, context.projectRoot);

  // Step 3: IDE Selection (CHECKBOX with instructions)
  console.log('');
  console.log(chalk.gray('─'.repeat(80)));
  console.log(
    chalk.dim(
      '  Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed'
    )
  );
  console.log('');

  const { ides } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'ides',
      message: chalk.white('Which IDE(s) will you use?'),
      choices: [
        {
          name: '  Claude Code ' + chalk.blue('(v2.1)') + chalk.gray(' - Recommended'),
          value: 'claude',
          checked: true,
        },
        { name: '  Cursor ' + chalk.blue('(v2.1)'), value: 'cursor' },
        { name: '  Windsurf ' + chalk.blue('(v2.1)'), value: 'windsurf' },
        { name: '  Trae ' + chalk.blue('(v2.1)'), value: 'trae' },
        { name: '  Roo Code ' + chalk.blue('(v2.1)'), value: 'roo' },
        { name: '  Cline ' + chalk.blue('(v2.1)'), value: 'cline' },
        { name: '  Gemini CLI ' + chalk.blue('(v2.1)'), value: 'gemini' },
        { name: '  GitHub Copilot ' + chalk.blue('(v2.1)'), value: 'github-copilot' },
        {
          name: '  AntiGravity ' + chalk.blue('(v2.1)') + chalk.gray(' - Google AI IDE'),
          value: 'antigravity',
        },
        new inquirer.Separator(chalk.gray('─'.repeat(40))),
        { name: '  Skip IDE setup', value: 'none' },
      ],
      validate: function (answer) {
        if (answer.length < 1) {
          return 'You must choose at least one option.';
        }
        return true;
      },
    },
  ]);

  // Step 4a: Check and offer to install CLI tools
  const cliToolsToCheck = [];
  if (ides.includes('claude')) {
    cliToolsToCheck.push({ ide: 'claude', command: 'claude', name: 'Claude Code', npm: '@anthropic-ai/claude-code' });
  }
  if (ides.includes('gemini')) {
    cliToolsToCheck.push({ ide: 'gemini', command: 'gemini', name: 'Gemini CLI', npm: '@google/gemini-cli' });
  }

  if (cliToolsToCheck.length > 0) {
    console.log('');
    console.log(chalk.blue('🔍 Checking CLI tools...'));

    const missingTools = [];
    for (const tool of cliToolsToCheck) {
      try {
        const checkCmd = process.platform === 'win32' ? `where ${tool.command}` : `command -v ${tool.command}`;
        require('child_process').execSync(checkCmd, { stdio: 'ignore' });
        console.log(chalk.green('✓') + ` ${tool.name} is installed`);
      } catch {
        console.log(chalk.yellow('⚠') + ` ${tool.name} is not installed`);
        missingTools.push(tool);
      }
    }

    if (missingTools.length > 0) {
      console.log('');
      const toolNames = missingTools.map(t => t.name).join(', ');
      const { installClis } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installClis',
          message: chalk.white(`Would you like to install ${toolNames}?`),
          default: true,
        },
      ]);

      if (installClis) {
        for (const tool of missingTools) {
          console.log(chalk.blue(`📥 Installing ${tool.name}...`));
          try {
            require('child_process').execSync(`npm install -g ${tool.npm}`, { stdio: 'inherit' });
            console.log(chalk.green('✓') + ` ${tool.name} installed successfully`);

            // Show post-install instructions
            if (tool.ide === 'claude') {
              console.log(chalk.gray('  Run `claude` to authenticate with your Anthropic account'));
            } else if (tool.ide === 'gemini') {
              console.log(chalk.gray('  Run `gemini` to authenticate with your Google account'));
            }
          } catch (error) {
            console.log(chalk.red('✗') + ` Failed to install ${tool.name}: ${error.message}`);
            console.log(chalk.gray(`  You can install manually: npm install -g ${tool.npm}`));
          }
        }
      } else {
        console.log(chalk.gray('  Skipping CLI installation. You can install later:'));
        for (const tool of missingTools) {
          console.log(chalk.gray(`    npm install -g ${tool.npm}`));
        }
      }
    }
  }

  // Step 4b: Copy Electron AAOS Core files
  console.log('');
  console.log(chalk.blue('📦 Installing Electron AAOS Core files...'));

  const sourceCoreDir = path.join(context.frameworkLocation, '.electron-aaos-core');
  const targetCoreDir = path.join(context.projectRoot, '.electron-aaos-core');

  if (fs.existsSync(sourceCoreDir)) {
    await fse.copy(sourceCoreDir, targetCoreDir);
    console.log(
      chalk.green('✓') +
        ' Electron AAOS Core files installed ' +
        chalk.gray('(11 agents, 68 tasks, 23 templates)')
    );

    // Create installed manifest for brownfield upgrades (Story 6.18)
    if (brownfieldUpgrader) {
      try {
        const sourceManifest = brownfieldUpgrader.loadSourceManifest(sourceCoreDir);
        if (sourceManifest) {
          const packageJson = require(path.join(context.frameworkLocation, 'package.json'));
          brownfieldUpgrader.updateInstalledManifest(
            context.projectRoot,
            sourceManifest,
            `electron-aaos-core@${packageJson.version}`
          );
          console.log(
            chalk.green('✓') +
              ' Installation manifest created ' +
              chalk.gray('(enables future upgrades)')
          );
        }
      } catch (manifestErr) {
        // Non-critical - just log warning
        console.log(
          chalk.yellow('⚠') +
            ' Could not create installation manifest ' +
            chalk.gray('(brownfield upgrades may not work)')
        );
      }
    }
  } else {
    console.error(chalk.red('✗') + ' Electron AAOS Core files not found');
    process.exit(1);
  }

  // Copy IDE rules and commands if IDE was selected
  if (!ides.includes('none')) {
    console.log('');
    console.log(chalk.blue('📝 Installing IDE configurations...'));

    const ideRulesMap = {
      claude: { source: 'claude-rules.md', target: '.claude/CLAUDE.md' },
      cursor: { source: 'cursor-rules.md', target: '.cursor/rules.md' },
      windsurf: { source: 'windsurf-rules.md', target: '.windsurf/rules.md' },
      trae: { source: 'trae-rules.md', target: '.trae/rules.md' },
      roo: { source: 'roo-rules.md', target: '.roomodes' },
      cline: { source: 'cline-rules.md', target: '.cline/rules.md' },
      gemini: { source: 'gemini-rules.md', target: '.gemini/rules.md' },
      'github-copilot': { source: 'copilot-rules.md', target: '.github/chatmodes/electron-aaos-agent.md' },
      antigravity: { source: 'antigravity-rules.md', target: '.antigravity/rules.md' },
    };

    // Step 1: Copy basic IDE rules files
    for (const ide of ides) {
      if (ide !== 'none' && ideRulesMap[ide]) {
        const ideConfig = ideRulesMap[ide];
        const sourceRules = path.join(targetCoreDir, 'product', 'templates', 'ide-rules', ideConfig.source);
        const targetRules = path.join(context.projectRoot, ideConfig.target);

        if (fs.existsSync(sourceRules)) {
          await fse.ensureDir(path.dirname(targetRules));
          await fse.copy(sourceRules, targetRules);
          console.log(
            chalk.green('✓') + ` ${ide.charAt(0).toUpperCase() + ide.slice(1)} base rules installed`
          );
        }
      }
    }

    // Step 2: Install Electron AAOS CORE agents and tasks for Claude Code
    // v2.1: Agents and tasks are in development/ module
    if (ides.includes('claude')) {
      const coreAgentsSource = path.join(targetCoreDir, 'development', 'agents');
      const coreAgentsTarget = path.join(
        context.projectRoot,
        '.claude',
        'commands',
        'Electron AAOS',
        'agents'
      );

      const coreTasksSource = path.join(targetCoreDir, 'development', 'tasks');
      const coreTasksTarget = path.join(
        context.projectRoot,
        '.claude',
        'commands',
        'Electron AAOS',
        'tasks'
      );

      if (fs.existsSync(coreAgentsSource)) {
        await fse.copy(coreAgentsSource, coreAgentsTarget);
        const agentCount = fs.readdirSync(coreAgentsSource).filter((f) => f.endsWith('.md')).length;
        console.log(chalk.green('✓') + ` Claude Code CORE agents installed (${agentCount} agents)`);
      }

      if (fs.existsSync(coreTasksSource)) {
        await fse.copy(coreTasksSource, coreTasksTarget);
        const taskCount = fs.readdirSync(coreTasksSource).filter((f) => f.endsWith('.md')).length;
        console.log(chalk.green('✓') + ` Claude Code CORE tasks installed (${taskCount} tasks)`);
      }

      // Create Electron AAOS README for Claude Code
      const electron-aaossReadme = path.join(
        context.projectRoot,
        '.claude',
        'commands',
        'Electron AAOS',
        'README.md'
      );
      await fse.ensureDir(path.dirname(electron-aaossReadme));
      await fse.writeFile(
        electron-aaossReadme,
        `# Electron AAOS Core Commands

This directory contains the core Electron AAOS-FullStack agents and tasks.

## Usage
- Agents: Use slash commands like /dev, /architect, /qa, /pm, etc.
- Tasks: Reference tasks in agent workflows

## Documentation
See .electron-aaos-core/user-guide.md for complete documentation.
`
      );
    }

    // Step 3: Install Electron AAOS CORE agents for Cursor
    // v2.1: Agents are in development/ module
    if (ides.includes('cursor')) {
      const coreAgentsSource = path.join(targetCoreDir, 'development', 'agents');
      const cursorRulesTarget = path.join(
        context.projectRoot,
        '.cursor',
        'rules',
        'Electron AAOS',
        'agents'
      );

      if (fs.existsSync(coreAgentsSource)) {
        await fse.ensureDir(cursorRulesTarget);

        // Convert .md files to .mdc for Cursor
        const agentFiles = fs.readdirSync(coreAgentsSource).filter((f) => f.endsWith('.md'));
        for (const agentFile of agentFiles) {
          const sourcePath = path.join(coreAgentsSource, agentFile);
          const targetFileName = agentFile.replace('.md', '.mdc');
          const targetPath = path.join(cursorRulesTarget, targetFileName);
          await fse.copy(sourcePath, targetPath);
        }

        console.log(
          chalk.green('✓') + ` Cursor CORE rules installed (${agentFiles.length} agents)`
        );
      }

      // Create Electron AAOS README for Cursor
      const cursorReadme = path.join(context.projectRoot, '.cursor', 'rules', 'Electron AAOS', 'README.md');
      await fse.ensureDir(path.dirname(cursorReadme));
      await fse.writeFile(
        cursorReadme,
        `# Electron AAOS Core Rules

This directory contains the core Electron AAOS-FullStack agent rules for Cursor.

## Usage
These rules are automatically loaded by Cursor to provide agent-specific context.

## Documentation
See .electron-aaos-core/user-guide.md for complete documentation.
`
      );
    }

    // Step 4: Install Electron AAOS CORE agents for other IDEs (Trae, Cline, Gemini, AntiGravity)
    // v2.1: Agents are in development/ module
    const otherIdeInstalls = ['trae', 'cline', 'gemini', 'antigravity'];
    for (const ide of otherIdeInstalls) {
      if (ides.includes(ide)) {
        const coreAgentsSource = path.join(targetCoreDir, 'development', 'agents');
        const ideRulesDir = ide === 'gemini' ? '.gemini' : `.${ide}`;
        const ideRulesTarget = path.join(
          context.projectRoot,
          ideRulesDir,
          'rules',
          'Electron AAOS',
          'agents'
        );

        if (fs.existsSync(coreAgentsSource)) {
          await fse.ensureDir(ideRulesTarget);

          // Copy agent files
          const agentFiles = fs.readdirSync(coreAgentsSource).filter((f) => f.endsWith('.md'));
          for (const agentFile of agentFiles) {
            const sourcePath = path.join(coreAgentsSource, agentFile);
            const targetPath = path.join(ideRulesTarget, agentFile);
            await fse.copy(sourcePath, targetPath);
          }

          const ideName = ide.charAt(0).toUpperCase() + ide.slice(1);
          console.log(
            chalk.green('✓') + ` ${ideName} CORE agents installed (${agentFiles.length} agents)`
          );
        }
      }
    }

    // Step 5: Install Roo Code modes
    // v2.1: Agents are in development/ module
    if (ides.includes('roo')) {
      const coreAgentsSource = path.join(targetCoreDir, 'development', 'agents');
      const rooModesPath = path.join(context.projectRoot, '.roomodes');

      if (fs.existsSync(coreAgentsSource)) {
        const agentFiles = fs.readdirSync(coreAgentsSource).filter((f) => f.endsWith('.md'));

        // Create .roomodes JSON file
        const roomodes = {
          customModes: agentFiles.map((f) => {
            const agentName = f.replace('.md', '');
            return {
              slug: `bmad-${agentName}`,
              name: `Electron AAOS ${agentName.charAt(0).toUpperCase() + agentName.slice(1)}`,
              roleDefinition: `Electron AAOS-FullStack ${agentName} agent - see .electron-aaos-core/agents/${f}`,
              groups: ['electron-aaos'],
              source: 'project',
            };
          }),
        };

        await fse.writeFile(rooModesPath, JSON.stringify(roomodes, null, 2));
        console.log(chalk.green('✓') + ` Roo Code modes installed (${agentFiles.length} modes)`);
      }
    }

    // Step 6: Install GitHub Copilot chat modes
    // v2.1: Agents are in development/ module
    if (ides.includes('github-copilot')) {
      const coreAgentsSource = path.join(targetCoreDir, 'development', 'agents');
      const copilotModesDir = path.join(context.projectRoot, '.github', 'chatmodes');

      if (fs.existsSync(coreAgentsSource)) {
        await fse.ensureDir(copilotModesDir);

        const agentFiles = fs.readdirSync(coreAgentsSource).filter((f) => f.endsWith('.md'));
        for (const agentFile of agentFiles) {
          const sourcePath = path.join(coreAgentsSource, agentFile);
          const agentName = agentFile.replace('.md', '');
          const targetPath = path.join(copilotModesDir, `electron-aaos-${agentName}.md`);
          await fse.copy(sourcePath, targetPath);
        }

        console.log(
          chalk.green('✓') + ` GitHub Copilot chat modes installed (${agentFiles.length} modes)`
        );
      }
    }
  }

  // Step 7: Expansion Packs (CHECKBOX with visual)
  // Try multiple locations for expansion-packs (npm package vs local development vs npx)
  // __dirname is the 'bin/' directory of the package, so '..' gives us the package root
  const packageRoot = path.resolve(__dirname, '..');

  const possibleExpansionDirs = [
    // Primary: relative to this script (works for npx and local)
    path.join(packageRoot, 'expansion-packs'),
    // Secondary: context-based framework location
    path.join(context.frameworkLocation, 'expansion-packs'),
    // Tertiary: installed in project's node_modules
    path.join(context.projectRoot, 'node_modules', '@electron-aaos/electron-aaos-core', 'expansion-packs'),
    path.join(context.projectRoot, 'node_modules', '@electron-aaos', 'fullstack', 'expansion-packs'),
  ];

  let sourceExpansionDir = null;
  for (const dir of possibleExpansionDirs) {
    if (fs.existsSync(dir)) {
      sourceExpansionDir = dir;
      break;
    }
  }

  const availablePacks = [];
  let expansionPacks = []; // Declare here to be accessible in summary

  if (sourceExpansionDir && fs.existsSync(sourceExpansionDir)) {
    let packs = fs
      .readdirSync(sourceExpansionDir)
      .filter((f) => fs.statSync(path.join(sourceExpansionDir, f)).isDirectory());

    // Filter for minimal mode - only show expansion-creator
    if (isMinimalMode) {
      packs = packs.filter((pack) => pack === 'expansion-creator');
    }

    availablePacks.push(...packs);
  }

  if (availablePacks.length > 0) {
    console.log('');
    console.log(chalk.gray('─'.repeat(80)));
    console.log(
      chalk.dim(
        '  Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed'
      )
    );
    console.log('');

    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'expansionPacks',
        message: chalk.white('Select expansion packs to install (optional)'),
        choices: availablePacks.map((pack) => ({
          name: '  ' + pack,
          value: pack,
        })),
      },
    ]);

    expansionPacks = result.expansionPacks; // Assign to outer scope variable

    if (expansionPacks.length > 0) {
      console.log('');
      console.log(chalk.blue('📦 Installing expansion packs...'));

      const targetExpansionDir = path.join(context.projectRoot, 'expansion-packs');

      for (const pack of expansionPacks) {
        const sourcePack = path.join(sourceExpansionDir, pack);
        const targetPack = path.join(targetExpansionDir, pack);
        await fse.copy(sourcePack, targetPack);
        console.log(chalk.green('✓') + ` Expansion pack installed: ${pack}`);

        // Install expansion pack agents/tasks for Claude Code
        if (ides.includes('claude')) {
          const packAgentsSource = path.join(targetPack, 'agents');
          const packTasksSource = path.join(targetPack, 'tasks');
          const packReadmeSource = path.join(targetPack, 'README.md');

          const packClaudeTarget = path.join(context.projectRoot, '.claude', 'commands', pack);

          // Copy agents
          if (fs.existsSync(packAgentsSource)) {
            const packAgentsTarget = path.join(packClaudeTarget, 'agents');
            await fse.copy(packAgentsSource, packAgentsTarget);
            const agentCount = fs
              .readdirSync(packAgentsSource)
              .filter((f) => f.endsWith('.md')).length;
            console.log(chalk.green('  ✓') + ` Claude Code ${pack} agents (${agentCount} agents)`);
          }

          // Copy tasks
          if (fs.existsSync(packTasksSource)) {
            const packTasksTarget = path.join(packClaudeTarget, 'tasks');
            await fse.copy(packTasksSource, packTasksTarget);
            const taskCount = fs
              .readdirSync(packTasksSource)
              .filter((f) => f.endsWith('.md')).length;
            console.log(chalk.green('  ✓') + ` Claude Code ${pack} tasks (${taskCount} tasks)`);
          }

          // Copy README
          if (fs.existsSync(packReadmeSource)) {
            await fse.copy(packReadmeSource, path.join(packClaudeTarget, 'README.md'));
          }
        }

        // Install expansion pack agents for Cursor
        if (ides.includes('cursor')) {
          const packAgentsSource = path.join(targetPack, 'agents');
          const packReadmeSource = path.join(targetPack, 'README.md');

          if (fs.existsSync(packAgentsSource)) {
            const cursorPackTarget = path.join(
              context.projectRoot,
              '.cursor',
              'rules',
              pack,
              'agents'
            );
            await fse.ensureDir(cursorPackTarget);

            // Convert .md files to .mdc for Cursor
            const agentFiles = fs.readdirSync(packAgentsSource).filter((f) => f.endsWith('.md'));
            for (const agentFile of agentFiles) {
              const sourcePath = path.join(packAgentsSource, agentFile);
              const targetFileName = agentFile.replace('.md', '.mdc');
              const targetPath = path.join(cursorPackTarget, targetFileName);
              await fse.copy(sourcePath, targetPath);
            }

            console.log(chalk.green('  ✓') + ` Cursor ${pack} rules (${agentFiles.length} agents)`);

            // Copy README for Cursor
            if (fs.existsSync(packReadmeSource)) {
              await fse.copy(
                packReadmeSource,
                path.join(context.projectRoot, '.cursor', 'rules', pack, 'README.md')
              );
            }
          }
        }
      }
    }
  }

  // Post-installation validation (Story 6.19)
  console.log('');
  console.log(chalk.blue('🔍 Validating installation integrity...'));

  let validationPassed = true;
  try {
    const { PostInstallValidator } = require('../packages/installer/src/installer/post-install-validator');
    const validator = new PostInstallValidator(context.projectRoot, context.frameworkLocation, {
      verifyHashes: false,
      verbose: false,
      // SECURITY NOTE: Signature verification is disabled during initial installation
      // because the manifest signature (.minisig) may not yet be present in the package.
      // This is acceptable for post-install validation which only checks file presence.
      // For production integrity checks, users should run `electron-aaos validate` which
      // enforces signature verification when the .minisig file is present.
      requireSignature: false,
    });

    const report = await validator.validate();

    if (
      report.status === 'failed' ||
      report.stats.missingFiles > 0 ||
      report.stats.corruptedFiles > 0
    ) {
      validationPassed = false;
      console.log(chalk.yellow('⚠') + ` Installation validation found issues:`);
      console.log(chalk.dim(`   - Missing files: ${report.stats.missingFiles}`));
      console.log(chalk.dim(`   - Corrupted files: ${report.stats.corruptedFiles}`));
      console.log('');
      console.log(
        chalk.yellow('   Run ') +
          chalk.cyan('electron-aaos validate --repair') +
          chalk.yellow(' to fix issues')
      );
    } else {
      console.log(chalk.green('✓') + ` Installation verified (${report.stats.validFiles} files)`);
    }
  } catch (validationError) {
    // Log validation errors but don't fail installation
    // This allows installation to proceed even if validator module has issues
    // However, users should investigate validation errors manually
    validationPassed = false;
    console.log(chalk.yellow('⚠') + ' Post-installation validation encountered an error');
    console.log(chalk.dim(`   Error: ${validationError.message}`));
    if (process.env.DEBUG || process.env.Electron AAOS_DEBUG) {
      console.log(chalk.dim(`   Stack: ${validationError.stack}`));
    }
    console.log(chalk.dim('   Run `electron-aaos validate` to check installation integrity'));
  }

  // Summary
  console.log('');
  console.log(chalk.gray('═'.repeat(80)));
  console.log('');
  console.log(chalk.green.bold('✓ Electron AAOS-FullStack installation complete! 🎉'));
  console.log('');
  console.log(chalk.cyan('📋 Configuration Summary:'));
  console.log('  ' + chalk.dim('Mode:           ') + installMode);
  console.log('  ' + chalk.dim('Version:        ') + packageJsonVersion);
  console.log('  ' + chalk.dim('Repository:     ') + context.repositoryUrl);
  console.log(
    '  ' + chalk.dim('IDE(s):         ') + (ides.includes('none') ? 'none' : ides.join(', '))
  );
  console.log('  ' + chalk.dim('PM Tool:        ') + pmTool);

  if (availablePacks.length > 0 && expansionPacks && expansionPacks.length > 0) {
    console.log('  ' + chalk.dim('Expansion Packs:') + ' ' + expansionPacks.join(', '));
  }

  console.log('');
  console.log(chalk.cyan('📁 Installed Structure:'));
  console.log('  ' + chalk.dim('.electron-aaos-core/') + '           - Framework core files');

  if (ides.includes('claude')) {
    console.log('  ' + chalk.dim('.claude/'));
    console.log('    ' + chalk.dim('├─ CLAUDE.md') + '        - Main configuration');
    console.log('    ' + chalk.dim('└─ commands/'));
    console.log('      ' + chalk.dim('  ├─ Electron AAOS/') + '         - Core agents & tasks');
    if (expansionPacks && expansionPacks.length > 0) {
      expansionPacks.forEach((pack) => {
        console.log('      ' + chalk.dim(`  └─ ${pack}/`) + '     - Expansion pack commands');
      });
    }
  }

  if (ides.includes('cursor')) {
    console.log('  ' + chalk.dim('.cursor/'));
    console.log('    ' + chalk.dim('├─ rules.md') + '         - Main configuration');
    console.log('    ' + chalk.dim('└─ rules/'));
    console.log('      ' + chalk.dim('  ├─ Electron AAOS/') + '         - Core agent rules');
    if (expansionPacks && expansionPacks.length > 0) {
      expansionPacks.forEach((pack) => {
        console.log('      ' + chalk.dim(`  └─ ${pack}/`) + '     - Expansion pack rules');
      });
    }
  }

  // Show other IDE installations
  const otherInstalledIdes = ['windsurf', 'trae', 'cline', 'gemini', 'antigravity'].filter((ide) =>
    ides.includes(ide)
  );
  for (const ide of otherInstalledIdes) {
    const ideDir = ide === 'gemini' ? '.gemini' : `.${ide}`;
    console.log(
      '  ' +
        chalk.dim(`${ideDir}/`) +
        '           - ' +
        ide.charAt(0).toUpperCase() +
        ide.slice(1) +
        ' configuration'
    );
  }

  if (ides.includes('roo')) {
    console.log('  ' + chalk.dim('.roomodes') + '            - Roo Code mode definitions');
  }

  if (ides.includes('github-copilot')) {
    console.log('  ' + chalk.dim('.github/chatmodes/') + '   - GitHub Copilot agent modes');
  }

  console.log('');
  console.log(chalk.cyan('📚 Next steps:'));

  if (ides.includes('claude')) {
    console.log('  ' + chalk.yellow('Claude Code:'));
    console.log('    • Use slash commands: /dev, /architect, /qa, /pm, /github-devops');
    console.log('    • Browse: .claude/commands/Electron AAOS/agents/ for all available agents');
  }

  if (ides.includes('cursor')) {
    console.log('  ' + chalk.yellow('Cursor:'));
    console.log('    • Agent rules auto-loaded from .cursor/rules/');
    console.log('    • Use @agent-name to activate agents in chat');
  }

  if (ides.includes('windsurf') || ides.includes('trae') || ides.includes('cline')) {
    console.log('  ' + chalk.yellow('Windsurf/Trae/Cline:'));
    console.log('    • Use @agent-name to activate agents in chat');
  }

  if (ides.includes('roo')) {
    console.log('  ' + chalk.yellow('Roo Code:'));
    console.log('    • Select agent mode from status bar mode selector');
  }

  if (ides.includes('gemini')) {
    console.log('  ' + chalk.yellow('Gemini CLI:'));
    console.log('    • Include agent context in your prompts');
  }

  if (ides.includes('github-copilot')) {
    console.log('  ' + chalk.yellow('GitHub Copilot:'));
    console.log('    • Open Chat view and select Agent mode');
    console.log('    • Requires VS Code 1.101+ with chat.agent.enabled: true');
  }

  if (ides.includes('antigravity')) {
    console.log('  ' + chalk.yellow('AntiGravity:'));
    console.log('    • Use Workspace Rules to activate agents');
    console.log('    • Browse: .antigravity/rules/Electron AAOS/agents/ for all available agents');
  }

  console.log('  ' + chalk.yellow('General:'));
  console.log('    • Run ' + chalk.yellow('electron-aaos validate') + ' to verify installation integrity');
  console.log('    • Run ' + chalk.yellow('electron-aaos validate --repair') + ' to fix any missing files');
  console.log('    • Check .electron-aaos-core/user-guide.md for complete documentation');
  console.log('    • Explore expansion-packs/ for additional capabilities');
  console.log('');
  console.log(chalk.gray('═'.repeat(80)));
  console.log('');
}

/**
 * Updates .gitignore file based on installation mode
 */
function updateGitIgnore(mode, projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');

  let gitignore = '';
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf8');
  }

  if (mode === 'project-development') {
    const frameworkRules = [
      '',
      '# Electron AAOS-FullStack Framework Files (auto-managed - do not edit)',
      '.electron-aaos-core/',
      'node_modules/@electron-aaos/',
      'outputs/minds/',
      '.electron-aaos-installation-config.yaml',
      '# End Electron AAOS-FullStack auto-managed section',
      '',
    ];

    const hasFrameworkSection = gitignore.includes('# Electron AAOS-FullStack Framework Files');

    if (!hasFrameworkSection) {
      gitignore += frameworkRules.join('\n');
      fs.writeFileSync(gitignorePath, gitignore);
    }
  }
}

/**
 * Save PM configuration
 */
function savePMConfig(pmTool, config, projectRoot) {
  const pmConfigData = {
    pm_tool: {
      type: pmTool,
      configured_at: new Date().toISOString(),
      config: config,
    },
    sync_behavior: {
      auto_sync_on_status_change: true,
      create_tasks_on_story_creation: false,
      bidirectional_sync: false,
    },
  };

  const configPath = path.join(projectRoot, '.electron-aaos-pm-config.yaml');
  fs.writeFileSync(configPath, yaml.dump(pmConfigData));
}

// Run installer with error handling
main().catch((error) => {
  console.error('');
  console.error(chalk.red('✗ Installation failed: ') + error.message);
  console.error('');
  process.exit(1);
});
