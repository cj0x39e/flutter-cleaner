import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseCleaner } from '../../cleaners/BaseCleaner';

describe('BaseCleaner', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-cleaner-project');
  const testFile = path.join(testDir, 'cache', 'test.txt');

  class TestCleaner extends BaseCleaner {
    constructor() {
      super('Test');
    }

    getPaths(projectPath: string): string[] {
      return [
        path.join(projectPath, 'cache'),
        path.join(projectPath, 'non-existent'),
      ];
    }
  }

  beforeAll(async () => {
    await fs.ensureDir(path.dirname(testFile));
    await fs.writeFile(testFile, 'test content for cleaner');
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('getName', () => {
    it('should return the cleaner name', () => {
      const cleaner = new TestCleaner();
      expect(cleaner.getName()).toBe('Test');
    });
  });

  describe('clean', () => {
    it('should delete existing paths', async () => {
      const cleaner = new TestCleaner();
      const result = await cleaner.clean(testDir, { verbose: false });

      expect(result.success).toBe(true);
      expect(result.deletedPaths.length).toBeGreaterThan(0);
      expect(result.warningPaths.length).toBe(0);
    });

    it('should handle non-existing paths gracefully', async () => {
      const cleaner = new TestCleaner();
      const result = await cleaner.clean(testDir, { verbose: false });

      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should not delete files in dry-run mode', async () => {
      // Recreate the test file
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, 'test content');

      const cleaner = new TestCleaner();
      const result = await cleaner.clean(testDir, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.deletedPaths.length).toBeGreaterThan(0);
      expect(await fs.pathExists(testFile)).toBe(true);

      // Actually clean now
      await cleaner.clean(testDir, { dryRun: false });
    });

    it('should track freed space', async () => {
      // Recreate the test file
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, 'test content for size');

      const cleaner = new TestCleaner();
      const result = await cleaner.clean(testDir, { verbose: false });

      expect(result.freedSpace).toBeGreaterThan(0);
    });
  });

  describe('preview', () => {
    it('should return paths and size for preview', async () => {
      // Recreate the test file
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, 'test content for preview');

      const cleaner = new TestCleaner();
      const preview = await cleaner.preview(testDir);

      expect(preview.paths.length).toBeGreaterThan(0);
      expect(preview.totalSize).toBeGreaterThan(0);
    });

    it('should return empty for non-existent paths', async () => {
      const cleaner = new TestCleaner();
      const preview = await cleaner.preview('/non/existent/path');

      expect(preview.paths.length).toBe(0);
      expect(preview.totalSize).toBe(0);
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path', () => {
      const cleaner = new TestCleaner();
      const relative = cleaner.getRelativePath(
        path.join(testDir, 'cache'),
        testDir
      );
      expect(relative).toBe('cache');
    });

    it('should return . for same path', () => {
      const cleaner = new TestCleaner();
      const relative = cleaner.getRelativePath(testDir, testDir);
      expect(relative).toBe('.');
    });
  });
});
