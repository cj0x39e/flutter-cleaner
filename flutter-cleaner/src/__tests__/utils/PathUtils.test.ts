import * as path from 'path';
import {
  getProjectRoot,
  resolveFlutterPaths,
  resolveAndroidPaths,
  resolveIOSPaths,
  resolveAllPaths,
  getFastCleanPaths,
  getStandardCleanPaths,
  getHomeDir,
  getPubCachePath,
} from '../../utils/PathUtils';

describe('PathUtils', () => {
  describe('getProjectRoot', () => {
    it('should return absolute path', () => {
      const root = getProjectRoot('./test');
      expect(path.isAbsolute(root)).toBe(true);
    });
  });

  describe('resolveFlutterPaths', () => {
    it('should return all Flutter cache paths', () => {
      const projectPath = '/test/project';
      const paths = resolveFlutterPaths(projectPath);

      expect(paths.build).toBe('/test/project/build');
      expect(paths.dartTool).toBe('/test/project/.dart_tool');
      expect(paths.flutterPlugins).toBe('/test/project/.flutter-plugins');
      expect(paths.flutterPluginsDependencies).toBe(
        '/test/project/.flutter-plugins-dependencies'
      );
      expect(paths.packages).toBe('/test/project/.packages');
    });
  });

  describe('resolveAndroidPaths', () => {
    it('should return Android paths when android directory exists', () => {
      const projectPath = path.join(__dirname, '..', '..', 'test-flutter-project');
      const androidDir = path.join(projectPath, 'android');

      // Create test directory
      require('fs').mkdirSync(androidDir, { recursive: true });

      const paths = resolveAndroidPaths(projectPath);

      expect(paths).not.toBeNull();
      expect(paths!.build).toBe(path.join(androidDir, 'build'));
      expect(paths!.appBuild).toBe(path.join(androidDir, 'app', 'build'));
      expect(paths!.gradle).toBe(path.join(androidDir, '.gradle'));
      expect(paths!.idea).toBe(path.join(androidDir, '.idea'));

      // Cleanup
      require('fs').rmSync(androidDir, { recursive: true });
    });

    it('should return null when android directory does not exist', () => {
      const paths = resolveAndroidPaths('/non/existent/path');
      expect(paths).toBeNull();
    });
  });

  describe('resolveIOSPaths', () => {
    it('should return iOS paths when ios directory exists', () => {
      const projectPath = path.join(__dirname, '..', '..', 'test-flutter-project');
      const iosDir = path.join(projectPath, 'ios');

      // Create test directory
      require('fs').mkdirSync(iosDir, { recursive: true });

      const paths = resolveIOSPaths(projectPath);

      expect(paths).not.toBeNull();
      expect(paths!.build).toBe(path.join(iosDir, 'build'));
      expect(paths!.pods).toBe(path.join(iosDir, 'Pods'));
      expect(paths!.symlinks).toBe(path.join(iosDir, '.symlinks'));

      // Cleanup
      require('fs').rmSync(iosDir, { recursive: true });
    });

    it('should return null when ios directory does not exist', () => {
      const paths = resolveIOSPaths('/non/existent/path');
      expect(paths).toBeNull();
    });
  });

  describe('getFastCleanPaths', () => {
    it('should return paths for fast clean mode', () => {
      const projectPath = path.join(__dirname, '..', '..', 'test-flutter-project');
      const androidDir = path.join(projectPath, 'android');
      const iosDir = path.join(projectPath, 'ios');

      // Create test directories
      require('fs').mkdirSync(androidDir, { recursive: true });
      require('fs').mkdirSync(iosDir, { recursive: true });

      const paths = getFastCleanPaths(projectPath);

      expect(paths).toContain(path.join(projectPath, 'build'));
      expect(paths).toContain(path.join(androidDir, 'build'));
      expect(paths).toContain(path.join(androidDir, 'app', 'build'));
      expect(paths).toContain(path.join(iosDir, 'build'));

      // Cleanup
      require('fs').rmSync(androidDir, { recursive: true });
      require('fs').rmSync(iosDir, { recursive: true });
    });
  });

  describe('getStandardCleanPaths', () => {
    it('should return more paths than fast mode', () => {
      const projectPath = path.join(__dirname, '..', '..', 'test-flutter-project');
      const androidDir = path.join(projectPath, 'android');
      const iosDir = path.join(projectPath, 'ios');

      // Create test directories
      require('fs').mkdirSync(androidDir, { recursive: true });
      require('fs').mkdirSync(iosDir, { recursive: true });

      const fastPaths = getFastCleanPaths(projectPath);
      const standardPaths = getStandardCleanPaths(projectPath);

      expect(standardPaths.length).toBeGreaterThan(fastPaths.length);

      // Cleanup
      require('fs').rmSync(androidDir, { recursive: true });
      require('fs').rmSync(iosDir, { recursive: true });
    });
  });

  describe('getHomeDir', () => {
    it('should return home directory', () => {
      const home = getHomeDir();
      expect(home).toBeTruthy();
      expect(path.isAbsolute(home)).toBe(true);
    });
  });

  describe('getPubCachePath', () => {
    it('should return pub-cache path', () => {
      const pubCache = getPubCachePath();
      expect(pubCache).toBeTruthy();
      expect(pubCache).toContain('.pub-cache');
    });
  });
});
