/**
 * Gitignore Generator Unit Tests
 *
 * @module tests/unit/documentation-integrity/gitignore-generator
 * @story 6.9
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  loadGitignoreTemplate,
  detectTechStacks,
  getTemplatesForStacks,
  generateGitignore,
  mergeGitignore,
  generateGitignoreFile,
  hasAiosIntegration,
  parseGitignore,
  GitignoreTemplates,
  TechStack,
} = require('../../../.electron-aaos-core/infrastructure/scripts/documentation-integrity/gitignore-generator');

describe('Gitignore Generator', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-aaos-gitignore-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadGitignoreTemplate', () => {
    it('should load Electron AAOS base template', () => {
      const template = loadGitignoreTemplate(GitignoreTemplates.Electron AAOS_BASE);

      expect(template).toContain('.electron-aaos-core/local/');
      expect(template).toContain('.env');
    });

    it('should load Node.js template', () => {
      const template = loadGitignoreTemplate(GitignoreTemplates.NODE);

      expect(template).toContain('node_modules/');
      expect(template).toContain('dist/');
    });

    it('should load Python template', () => {
      const template = loadGitignoreTemplate(GitignoreTemplates.PYTHON);

      expect(template).toContain('__pycache__/');
      expect(template).toContain('.venv');
    });

    it('should load brownfield merge template', () => {
      const template = loadGitignoreTemplate(GitignoreTemplates.BROWNFIELD_MERGE);

      expect(template).toContain('Electron AAOS Integration Section');
    });

    it('should throw for non-existent template', () => {
      expect(() => loadGitignoreTemplate('non-existent.tmpl')).toThrow('template not found');
    });
  });

  describe('detectTechStacks', () => {
    it('should detect Node.js project', () => {
      const markers = { hasPackageJson: true };
      const stacks = detectTechStacks(markers);

      expect(stacks).toContain(TechStack.NODE);
    });

    it('should detect Python project', () => {
      const markers = { hasPythonProject: true };
      const stacks = detectTechStacks(markers);

      expect(stacks).toContain(TechStack.PYTHON);
    });

    it('should detect Go project', () => {
      const markers = { hasGoMod: true };
      const stacks = detectTechStacks(markers);

      expect(stacks).toContain(TechStack.GO);
    });

    it('should detect Rust project', () => {
      const markers = { hasCargoToml: true };
      const stacks = detectTechStacks(markers);

      expect(stacks).toContain(TechStack.RUST);
    });

    it('should detect multiple stacks', () => {
      const markers = {
        hasPackageJson: true,
        hasPythonProject: true,
      };
      const stacks = detectTechStacks(markers);

      expect(stacks).toContain(TechStack.NODE);
      expect(stacks).toContain(TechStack.PYTHON);
    });

    it('should return empty array for no markers', () => {
      const stacks = detectTechStacks({});

      expect(stacks).toHaveLength(0);
    });
  });

  describe('getTemplatesForStacks', () => {
    it('should always include Electron AAOS base', () => {
      const templates = getTemplatesForStacks([]);

      expect(templates).toContain(GitignoreTemplates.Electron AAOS_BASE);
    });

    it('should include Node.js template', () => {
      const templates = getTemplatesForStacks([TechStack.NODE]);

      expect(templates).toContain(GitignoreTemplates.Electron AAOS_BASE);
      expect(templates).toContain(GitignoreTemplates.NODE);
    });

    it('should include Python template', () => {
      const templates = getTemplatesForStacks([TechStack.PYTHON]);

      expect(templates).toContain(GitignoreTemplates.Electron AAOS_BASE);
      expect(templates).toContain(GitignoreTemplates.PYTHON);
    });

    it('should include multiple templates for multi-stack', () => {
      const templates = getTemplatesForStacks([TechStack.NODE, TechStack.PYTHON]);

      expect(templates).toContain(GitignoreTemplates.Electron AAOS_BASE);
      expect(templates).toContain(GitignoreTemplates.NODE);
      expect(templates).toContain(GitignoreTemplates.PYTHON);
    });
  });

  describe('generateGitignore', () => {
    it('should generate gitignore for Node.js project', () => {
      const markers = { hasPackageJson: true };
      const content = generateGitignore(markers, { projectName: 'test-app' });

      expect(content).toContain('test-app');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.electron-aaos-core/local/');
    });

    it('should generate gitignore for Python project', () => {
      const markers = { hasPythonProject: true };
      const content = generateGitignore(markers);

      expect(content).toContain('__pycache__/');
      expect(content).toContain('.electron-aaos-core/local/');
    });

    it('should include generation date', () => {
      const content = generateGitignore({});
      const today = new Date().toISOString().split('T')[0];

      expect(content).toContain(today);
    });

    it('should indicate tech stack in header', () => {
      const markers = { hasPackageJson: true, hasPythonProject: true };
      const content = generateGitignore(markers);

      expect(content).toContain('node');
      expect(content).toContain('python');
    });
  });

  describe('mergeGitignore', () => {
    it('should append Electron AAOS section to existing content', () => {
      const existing = '# My project\nnode_modules/\n';
      const merged = mergeGitignore(existing);

      expect(merged).toContain('# My project');
      expect(merged).toContain('node_modules/');
      expect(merged).toContain('Electron AAOS Integration Section');
    });

    it('should skip if Electron AAOS section already exists', () => {
      const existing = '# Electron AAOS Integration Section\n.electron-aaos-core/\n';
      const merged = mergeGitignore(existing);

      expect(merged).toBe(existing);
    });

    it('should include date in merged section', () => {
      const merged = mergeGitignore('# Existing\n');
      const today = new Date().toISOString().split('T')[0];

      expect(merged).toContain(today);
    });
  });

  describe('generateGitignoreFile', () => {
    it('should create new .gitignore in empty directory', () => {
      const markers = { hasPackageJson: true };
      const result = generateGitignoreFile(tempDir, markers, { projectName: 'test' });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('created');
      expect(fs.existsSync(path.join(tempDir, '.gitignore'))).toBe(true);
    });

    it('should merge with existing .gitignore', () => {
      // Create existing gitignore
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '# Existing\n*.log\n');

      const markers = { hasPackageJson: true };
      const result = generateGitignoreFile(tempDir, markers, { merge: true });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('merged');
      expect(result.content).toContain('# Existing');
      expect(result.content).toContain('Electron AAOS Integration Section');
    });

    it('should support dry run mode', () => {
      const markers = { hasPackageJson: true };
      const result = generateGitignoreFile(tempDir, markers, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(fs.existsSync(path.join(tempDir, '.gitignore'))).toBe(false);
    });

    it('should include detected tech stacks in result', () => {
      const markers = { hasPackageJson: true, hasPythonProject: true };
      const result = generateGitignoreFile(tempDir, markers, { dryRun: true });

      expect(result.techStacks).toContain(TechStack.NODE);
      expect(result.techStacks).toContain(TechStack.PYTHON);
    });
  });

  describe('hasAiosIntegration', () => {
    it('should return false for empty directory', () => {
      expect(hasAiosIntegration(tempDir)).toBe(false);
    });

    it('should return true if Electron AAOS section exists', () => {
      fs.writeFileSync(
        path.join(tempDir, '.gitignore'),
        '# Electron AAOS Integration Section\n.electron-aaos-core/\n',
      );

      expect(hasAiosIntegration(tempDir)).toBe(true);
    });

    it('should return true if .electron-aaos-core/ pattern exists', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '.electron-aaos-core/local/\n');

      expect(hasAiosIntegration(tempDir)).toBe(true);
    });

    it('should return false for unrelated gitignore', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n');

      expect(hasAiosIntegration(tempDir)).toBe(false);
    });
  });

  describe('parseGitignore', () => {
    it('should parse patterns', () => {
      const content = 'node_modules/\n*.log\ndist/\n';
      const parsed = parseGitignore(content);

      expect(parsed.patterns).toHaveLength(3);
      expect(parsed.patterns[0].pattern).toBe('node_modules/');
    });

    it('should identify comments', () => {
      const content = '# Header\nnode_modules/\n# Section\ndist/\n';
      const parsed = parseGitignore(content);

      expect(parsed.comments).toHaveLength(2);
    });

    it('should identify Electron AAOS section', () => {
      const content = `# Header
node_modules/
# Electron AAOS Integration Section
.electron-aaos-core/
# End of Electron AAOS Integration Section
`;
      const parsed = parseGitignore(content);

      expect(parsed.electron-aaosSection).toBeDefined();
      expect(parsed.electron-aaosSection.start).toBeGreaterThan(0);
    });

    it('should return null electron-aaosSection when not present', () => {
      const content = 'node_modules/\n';
      const parsed = parseGitignore(content);

      expect(parsed.electron-aaosSection).toBeNull();
    });
  });

  describe('GitignoreTemplates enum', () => {
    it('should have all required templates', () => {
      expect(GitignoreTemplates.Electron AAOS_BASE).toBe('gitignore-electron-aaos-base.tmpl');
      expect(GitignoreTemplates.NODE).toBe('gitignore-node.tmpl');
      expect(GitignoreTemplates.PYTHON).toBe('gitignore-python.tmpl');
      expect(GitignoreTemplates.BROWNFIELD_MERGE).toBe('gitignore-brownfield-merge.tmpl');
    });
  });

  describe('TechStack enum', () => {
    it('should have all tech stacks', () => {
      expect(TechStack.NODE).toBe('node');
      expect(TechStack.PYTHON).toBe('python');
      expect(TechStack.GO).toBe('go');
      expect(TechStack.RUST).toBe('rust');
    });
  });
});
