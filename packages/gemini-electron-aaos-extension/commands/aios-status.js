#!/usr/bin/env node
/**
 * Electron AAOS Status Command for Gemini CLI Extension
 * Shows system status and provider information
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const projectDir = process.cwd();

  console.log('🔷 Electron AAOS Status\n');
  console.log('━'.repeat(40));

  // Check Electron AAOS installation
  const electron-aaosCorePath = path.join(projectDir, '.electron-aaos-core');
  if (fs.existsSync(electron-aaosCorePath)) {
    console.log('✅ Electron AAOS Core: Installed');

    // Count agents
    const agentsPath = path.join(electron-aaosCorePath, 'development', 'agents');
    if (fs.existsSync(agentsPath)) {
      const agents = fs.readdirSync(agentsPath).filter((f) => f.endsWith('.md'));
      console.log(`   Agents: ${agents.length}`);
    }

    // Count tasks
    const tasksPath = path.join(electron-aaosCorePath, 'development', 'tasks');
    if (fs.existsSync(tasksPath)) {
      const tasks = fs.readdirSync(tasksPath).filter((f) => f.endsWith('.md'));
      console.log(`   Tasks: ${tasks.length}`);
    }
  } else {
    console.log('❌ Electron AAOS Core: Not installed');
    console.log('   Run: npx electron-aaos-core install');
  }

  // Check providers
  console.log('\n📡 AI Providers:');

  try {
    require('child_process').execSync('claude --version', { stdio: 'pipe' });
    console.log('   ✅ Claude Code: Available');
  } catch {
    console.log('   ❌ Claude Code: Not installed');
  }

  try {
    require('child_process').execSync('gemini --version', { stdio: 'pipe' });
    console.log('   ✅ Gemini CLI: Available (current)');
  } catch {
    console.log('   ⚠️  Gemini CLI: Running from extension');
  }

  // Check config
  const configPath = path.join(projectDir, '.electron-aaos-ai-config.yaml');
  if (fs.existsSync(configPath)) {
    console.log('\n⚙️  AI Config: .electron-aaos-ai-config.yaml found');
  }

  console.log('\n' + '━'.repeat(40));
  console.log('Use @agent-name to activate an agent');
}

main().catch(console.error);
