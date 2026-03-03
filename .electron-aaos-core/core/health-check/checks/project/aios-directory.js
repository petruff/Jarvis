/**
 * Electron AAOS Directory Check
 *
 * Verifies .electron-aaos/ directory structure and permissions.
 *
 * @module @electron-aaos/electron-aaos-core/health-check/checks/project/electron-aaos-directory
 * @version 1.0.0
 * @story HCS-2 - Health Check System Implementation
 */

const fs = require('fs').promises;
const path = require('path');
const { BaseCheck, CheckSeverity, CheckDomain } = require('../../base-check');

/**
 * Expected .electron-aaos directory structure
 */
const EXPECTED_STRUCTURE = [
  { path: '.electron-aaos', type: 'directory', required: false },
  { path: '.electron-aaos/config.yaml', type: 'file', required: false },
  { path: '.electron-aaos/reports', type: 'directory', required: false },
  { path: '.electron-aaos/backups', type: 'directory', required: false },
];

/**
 * Electron AAOS directory structure check
 *
 * @class AiosDirectoryCheck
 * @extends BaseCheck
 */
class AiosDirectoryCheck extends BaseCheck {
  constructor() {
    super({
      id: 'project.electron-aaos-directory',
      name: 'Electron AAOS Directory Structure',
      description: 'Verifies .electron-aaos/ directory structure',
      domain: CheckDomain.PROJECT,
      severity: CheckSeverity.MEDIUM,
      timeout: 2000,
      cacheable: true,
      healingTier: 1, // Can auto-create directories
      tags: ['electron-aaos', 'directory', 'structure'],
    });
  }

  /**
   * Execute the check
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Check result
   */
  async execute(context) {
    const projectRoot = context.projectRoot || process.cwd();
    const electron-aaosPath = path.join(projectRoot, '.electron-aaos');
    const issues = [];
    const found = [];

    // Check if .electron-aaos exists at all
    try {
      const stats = await fs.stat(electron-aaosPath);
      if (!stats.isDirectory()) {
        return this.fail('.electron-aaos exists but is not a directory', {
          recommendation: 'Remove .electron-aaos file and run health check again',
        });
      }
      found.push('.electron-aaos');
    } catch {
      // .electron-aaos doesn't exist - this is optional
      return this.pass('.electron-aaos directory not present (optional)', {
        details: {
          message: '.electron-aaos directory is created automatically when needed',
          healable: true,
        },
      });
    }

    // Check subdirectories
    for (const item of EXPECTED_STRUCTURE.filter((i) => i.path !== '.electron-aaos')) {
      const fullPath = path.join(projectRoot, item.path);
      try {
        const stats = await fs.stat(fullPath);
        const typeMatch = item.type === 'directory' ? stats.isDirectory() : stats.isFile();
        if (typeMatch) {
          found.push(item.path);
        } else {
          issues.push(`${item.path} exists but is wrong type`);
        }
      } catch {
        if (item.required) {
          issues.push(`Missing: ${item.path}`);
        }
      }
    }

    // Check write permissions
    try {
      const testFile = path.join(electron-aaosPath, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch {
      issues.push('.electron-aaos directory is not writable');
    }

    if (issues.length > 0) {
      return this.warning(`Electron AAOS directory has issues: ${issues.join(', ')}`, {
        recommendation: 'Run health check with --fix to create missing directories',
        healable: true,
        healingTier: 1,
        details: { issues, found },
      });
    }

    return this.pass('Electron AAOS directory structure is valid', {
      details: { found },
    });
  }

  /**
   * Get healer for this check
   * @returns {Object} Healer configuration
   */
  getHealer() {
    return {
      name: 'create-electron-aaos-directories',
      action: 'create-directories',
      successMessage: 'Created missing Electron AAOS directories',
      fix: async (_result) => {
        const projectRoot = process.cwd();
        const dirs = ['.electron-aaos', '.electron-aaos/reports', '.electron-aaos/backups', '.electron-aaos/backups/health-check'];

        for (const dir of dirs) {
          const fullPath = path.join(projectRoot, dir);
          await fs.mkdir(fullPath, { recursive: true });
        }

        return { success: true, message: 'Created Electron AAOS directories' };
      },
    };
  }
}

module.exports = AiosDirectoryCheck;
