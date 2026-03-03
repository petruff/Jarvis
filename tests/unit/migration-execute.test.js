/**
 * Migration Execute Module Tests
 *
 * @story 2.14 - Migration Script v2.0 → v2.1
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  createModuleDirectories,
  migrateModule,
  executeMigration,
  saveMigrationState,
  loadMigrationState,
  clearMigrationState,
} = require('../../.electron-aaos-core/cli/commands/migrate/execute');
const { analyzeMigrationPlan } = require('../../.electron-aaos-core/cli/commands/migrate/analyze');

describe('Migration Execute Module', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `electron-aaos-execute-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (testDir && fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('createModuleDirectories', () => {
    it('should create all four module directories', async () => {
      const electron-aaosCoreDir = path.join(testDir, '.electron-aaos-core');
      await fs.promises.mkdir(electron-aaosCoreDir, { recursive: true });

      const result = await createModuleDirectories(electron-aaosCoreDir);

      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'core'))).toBe(true);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'development'))).toBe(true);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'product'))).toBe(true);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'infrastructure'))).toBe(true);
      expect(result.modules).toContain('core');
    });

    it('should not fail if directories already exist', async () => {
      const electron-aaosCoreDir = path.join(testDir, '.electron-aaos-core');
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'core'), { recursive: true });

      const result = await createModuleDirectories(electron-aaosCoreDir);

      expect(result.created).not.toContain(path.join(electron-aaosCoreDir, 'core'));
    });
  });

  describe('migrateModule', () => {
    it('should migrate files to module directory', async () => {
      const electron-aaosCoreDir = path.join(testDir, '.electron-aaos-core');
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'agents'), { recursive: true });
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'development'), { recursive: true });
      await fs.promises.writeFile(path.join(electron-aaosCoreDir, 'agents', 'dev.md'), 'Agent');

      const moduleData = {
        files: [{
          sourcePath: path.join(electron-aaosCoreDir, 'agents', 'dev.md'),
          relativePath: path.join('agents', 'dev.md'),
          size: 5,
        }],
      };

      const result = await migrateModule(moduleData, 'development', electron-aaosCoreDir);

      expect(result.migratedFiles).toHaveLength(1);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'development', 'agents', 'dev.md'))).toBe(true);
    });

    it('should support dry run mode', async () => {
      const electron-aaosCoreDir = path.join(testDir, '.electron-aaos-core');
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'agents'), { recursive: true });
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'development'), { recursive: true });
      await fs.promises.writeFile(path.join(electron-aaosCoreDir, 'agents', 'dev.md'), 'Agent');

      const moduleData = {
        files: [{
          sourcePath: path.join(electron-aaosCoreDir, 'agents', 'dev.md'),
          relativePath: path.join('agents', 'dev.md'),
          size: 5,
        }],
      };

      const result = await migrateModule(moduleData, 'development', electron-aaosCoreDir, { dryRun: true });

      expect(result.migratedFiles).toHaveLength(1);
      expect(result.migratedFiles[0].dryRun).toBe(true);
      // File should NOT be copied in dry run
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'development', 'agents', 'dev.md'))).toBe(false);
    });
  });

  describe('executeMigration', () => {
    it('should execute full migration', async () => {
      // Create v2.0 structure
      const electron-aaosCoreDir = path.join(testDir, '.electron-aaos-core');
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'agents'), { recursive: true });
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'registry'), { recursive: true });
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'cli'), { recursive: true });
      await fs.promises.writeFile(path.join(electron-aaosCoreDir, 'agents', 'dev.md'), 'Agent');
      await fs.promises.writeFile(path.join(electron-aaosCoreDir, 'registry', 'index.js'), 'Registry');
      await fs.promises.writeFile(path.join(electron-aaosCoreDir, 'cli', 'index.js'), 'CLI');

      const plan = await analyzeMigrationPlan(testDir);
      const result = await executeMigration(plan, { cleanupOriginals: false });

      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(3);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'development', 'agents', 'dev.md'))).toBe(true);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'core', 'registry', 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'product', 'cli', 'index.js'))).toBe(true);
    });

    it('should return error for non-migratable plan', async () => {
      const plan = { canMigrate: false, error: 'Test error' };
      const result = await executeMigration(plan);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should support dry run', async () => {
      const electron-aaosCoreDir = path.join(testDir, '.electron-aaos-core');
      await fs.promises.mkdir(path.join(electron-aaosCoreDir, 'agents'), { recursive: true });
      await fs.promises.writeFile(path.join(electron-aaosCoreDir, 'agents', 'dev.md'), 'Agent');

      const plan = await analyzeMigrationPlan(testDir);
      const result = await executeMigration(plan, { dryRun: true });

      expect(result.dryRun).toBe(true);
      // Directories should not be created in dry run
      expect(fs.existsSync(path.join(electron-aaosCoreDir, 'development'))).toBe(false);
    });
  });

  describe('Migration State', () => {
    it('should save and load migration state', async () => {
      await saveMigrationState(testDir, { phase: 'test', value: 123 });

      const state = await loadMigrationState(testDir);

      expect(state.phase).toBe('test');
      expect(state.value).toBe(123);
      expect(state.timestamp).toBeTruthy();
    });

    it('should return null if no state exists', async () => {
      const state = await loadMigrationState(testDir);
      expect(state).toBeNull();
    });

    it('should clear migration state', async () => {
      await saveMigrationState(testDir, { phase: 'test' });
      await clearMigrationState(testDir);

      const state = await loadMigrationState(testDir);
      expect(state).toBeNull();
    });
  });
});
