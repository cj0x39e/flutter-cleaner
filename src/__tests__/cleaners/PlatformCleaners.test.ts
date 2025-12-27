import * as fs from 'fs-extra';
import * as path from 'path';
import { FlutterCleaner } from '../../cleaners/FlutterCleaner';
import { AndroidCleaner } from '../../cleaners/AndroidCleaner';
import { IOSCleaner } from '../../cleaners/IOSCleaner';

describe('Platform Cleaners', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-platform-project');
  const androidDir = path.join(testDir, 'android');
  const iosDir = path.join(testDir, 'ios');

  beforeAll(async () => {
    // Create test project structure
    await fs.ensureDir(path.join(testDir, 'build'));
    await fs.ensureDir(path.join(testDir, '.dart_tool'));
    await fs.ensureDir(path.join(androidDir, 'build'));
    await fs.ensureDir(path.join(androidDir, 'app', 'build'));
    await fs.ensureDir(path.join(androidDir, '.gradle'));
    await fs.ensureDir(path.join(iosDir, 'build'));
    await fs.ensureDir(path.join(iosDir, 'Pods'));
    await fs.ensureDir(path.join(iosDir, '.symlinks'));

    // Create files
    await fs.writeFile(path.join(testDir, '.flutter-plugins'), '');
    await fs.writeFile(path.join(testDir, '.flutter-plugins-dependencies'), '');
    await fs.writeFile(path.join(testDir, '.packages'), '');
    await fs.ensureDir(path.join(androidDir, '.idea'));
    await fs.writeFile(path.join(androidDir, '.idea', 'workspace.xml'), '');
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('FlutterCleaner', () => {
    it('should return correct paths with default options', () => {
      const cleaner = new FlutterCleaner();
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(testDir, 'build'));
      expect(paths).toContain(path.join(testDir, '.dart_tool'));
      expect(paths).toContain(path.join(testDir, '.flutter-plugins'));
      expect(paths).toContain(path.join(testDir, '.flutter-plugins-dependencies'));
      expect(paths).toContain(path.join(testDir, '.packages'));
    });

    it('should filter paths based on options', () => {
      const cleaner = new FlutterCleaner({
        build: true,
        dartTool: false,
        pluginFiles: false,
      });
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(testDir, 'build'));
      expect(paths).not.toContain(path.join(testDir, '.dart_tool'));
      expect(paths).not.toContain(path.join(testDir, '.flutter-plugins'));
    });

    it('should return fast paths', () => {
      const paths = FlutterCleaner.getFastPaths(testDir);
      expect(paths).toEqual([path.join(testDir, 'build')]);
    });

    it('should return standard paths', () => {
      const paths = FlutterCleaner.getStandardPaths(testDir);
      expect(paths).toContain(path.join(testDir, 'build'));
      expect(paths).toContain(path.join(testDir, '.dart_tool'));
      expect(paths).toContain(path.join(testDir, '.flutter-plugins'));
    });
  });

  describe('AndroidCleaner', () => {
    it('should return correct paths with default options', () => {
      const cleaner = new AndroidCleaner();
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(androidDir, 'build'));
      expect(paths).toContain(path.join(androidDir, 'app', 'build'));
      expect(paths).toContain(path.join(androidDir, '.gradle'));
      expect(paths).not.toContain(path.join(androidDir, '.idea'));
    });

    it('should include .idea when enabled', () => {
      const cleaner = new AndroidCleaner({ idea: true });
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(androidDir, '.idea'));
    });

    it('should filter paths based on options', () => {
      const cleaner = new AndroidCleaner({
        build: true,
        gradle: false,
        idea: false,
      });
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(androidDir, 'build'));
      expect(paths).not.toContain(path.join(androidDir, '.gradle'));
    });

    it('should return fast paths', () => {
      const paths = AndroidCleaner.getFastPaths(testDir);
      expect(paths).toContain(path.join(androidDir, 'build'));
      expect(paths).toContain(path.join(androidDir, 'app', 'build'));
      expect(paths).not.toContain(path.join(androidDir, '.gradle'));
    });

    it('should return standard paths', () => {
      const paths = AndroidCleaner.getStandardPaths(testDir);
      expect(paths).toContain(path.join(androidDir, 'build'));
      expect(paths).toContain(path.join(androidDir, 'app', 'build'));
      expect(paths).toContain(path.join(androidDir, '.gradle'));
      expect(paths).toContain(path.join(androidDir, '.idea'));
    });
  });

  describe('IOSCleaner', () => {
    it('should return correct paths with default options', () => {
      const cleaner = new IOSCleaner();
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(iosDir, 'build'));
      expect(paths).toContain(path.join(iosDir, 'Pods'));
      expect(paths).toContain(path.join(iosDir, '.symlinks'));
      expect(paths).toContain(path.join(iosDir, 'Flutter', 'Flutter.framework'));
      expect(paths).toContain(path.join(iosDir, 'Flutter', 'App.framework'));
    });

    it('should filter paths based on options', () => {
      const cleaner = new IOSCleaner({
        build: true,
        pods: false,
        symlinks: false,
        frameworks: false,
      });
      const paths = cleaner.getPaths(testDir);

      expect(paths).toContain(path.join(iosDir, 'build'));
      expect(paths).not.toContain(path.join(iosDir, 'Pods'));
    });

    it('should return fast paths', () => {
      const paths = IOSCleaner.getFastPaths(testDir);
      expect(paths).toEqual([path.join(iosDir, 'build')]);
    });

    it('should return standard paths', () => {
      const paths = IOSCleaner.getStandardPaths(testDir);
      expect(paths).toContain(path.join(iosDir, 'build'));
      expect(paths).toContain(path.join(iosDir, 'Pods'));
      expect(paths).toContain(path.join(iosDir, '.symlinks'));
    });
  });

  describe('clean operations', () => {
    it('should clean Flutter paths', async () => {
      const cleaner = new FlutterCleaner();
      const result = await cleaner.clean(testDir);

      expect(result.success).toBe(true);
      expect(result.deletedPaths.length).toBeGreaterThan(0);
      // Note: freedSpace may be 0 if files are empty
    });

    it('should clean Android paths', async () => {
      const cleaner = new AndroidCleaner();
      const result = await cleaner.clean(testDir);

      expect(result.success).toBe(true);
      expect(result.deletedPaths.length).toBeGreaterThan(0);
    });

    it('should clean iOS paths', async () => {
      const cleaner = new IOSCleaner();
      const result = await cleaner.clean(testDir);

      expect(result.success).toBe(true);
      expect(result.deletedPaths.length).toBeGreaterThan(0);
    });

    it('should handle dry-run mode', async () => {
      // Recreate directories
      await fs.ensureDir(path.join(testDir, 'build'));
      await fs.ensureDir(path.join(androidDir, 'build'));

      const flutterCleaner = new FlutterCleaner();
      const flutterResult = await flutterCleaner.clean(testDir, { dryRun: true });

      expect(flutterResult.deletedPaths.length).toBeGreaterThan(0);
      expect(await fs.pathExists(path.join(testDir, 'build'))).toBe(true);

      // Clean up
      await flutterCleaner.clean(testDir);
    });
  });
});
