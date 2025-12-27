import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectDetector, ProjectInfo } from '../../core/ProjectDetector';

describe('ProjectDetector', () => {
  const detector = new ProjectDetector();
  const testDir = path.join(__dirname, '..', '..', 'test-flutter-project');
  const pubspecPath = path.join(testDir, 'pubspec.yaml');
  const androidDir = path.join(testDir, 'android');
  const iosDir = path.join(testDir, 'ios');
  const libDir = path.join(testDir, 'lib');

  beforeAll(async () => {
    // Create test Flutter project structure
    await fs.ensureDir(androidDir);
    await fs.ensureDir(iosDir);
    await fs.ensureDir(libDir);

    await fs.writeFile(
      pubspecPath,
      `name: test-flutter-app
description: A test Flutter project
version: 1.0.0

environment:
  sdk: ">=2.17.0 <3.0.0"

dependencies:
  flutter:
    sdk: flutter
`
    );

    // Create Android files
    await fs.ensureDir(path.join(androidDir, 'app'));
    await fs.writeFile(path.join(androidDir, 'build.gradle'), '// build.gradle');
    await fs.writeFile(path.join(androidDir, 'settings.gradle'), '// settings.gradle');
    await fs.writeFile(path.join(androidDir, 'app', 'build.gradle'), '// app build.gradle');

    // Create iOS files
    await fs.ensureDir(path.join(iosDir, 'Runner'));
    await fs.writeFile(path.join(iosDir, 'Runner', 'Info.plist'), '// Info.plist');
    await fs.writeFile(path.join(iosDir, 'Podfile'), '// Podfile');

    // Create lib files
    await fs.writeFile(path.join(libDir, 'main.dart'), 'void main() {}');
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('isFlutterProject', () => {
    it('should return true for Flutter project', async () => {
      expect(await detector.isFlutterProject(testDir)).toBe(true);
    });

    it('should return false for non-Flutter directory', async () => {
      expect(await detector.isFlutterProject(__dirname)).toBe(false);
    });
  });

  describe('hasAndroid', () => {
    it('should return true when Android directory exists with required files', async () => {
      expect(await detector.hasAndroid(testDir)).toBe(true);
    });

    it('should return false when Android directory does not exist', async () => {
      expect(await detector.hasAndroid('/non/existent')).toBe(false);
    });
  });

  describe('hasIOS', () => {
    it('should return true when iOS directory exists with required files', async () => {
      expect(await detector.hasIOS(testDir)).toBe(true);
    });

    it('should return false when iOS directory does not exist', async () => {
      expect(await detector.hasIOS('/non/existent')).toBe(false);
    });
  });

  describe('hasWeb', () => {
    it('should return false when web directory does not exist', async () => {
      expect(await detector.hasWeb(testDir)).toBe(false);
    });

    it('should return true when web directory exists', async () => {
      const webDir = path.join(testDir, 'web');
      await fs.ensureDir(webDir);
      expect(await detector.hasWeb(testDir)).toBe(true);
      await fs.remove(webDir);
    });
  });

  describe('getProjectName', () => {
    it('should return project name from pubspec.yaml', async () => {
      const name = await detector.getProjectName(testDir);
      expect(name).toBe('test-flutter-app');
    });

    it('should return directory name when pubspec.yaml is invalid', async () => {
      const invalidDir = path.join(__dirname, '..', 'invalid-project');
      await fs.ensureDir(invalidDir);
      const name = await detector.getProjectName(invalidDir);
      await fs.remove(invalidDir);
      expect(name).toBe('invalid-project');
    });
  });

  describe('detectProject', () => {
    it('should return ProjectInfo for valid Flutter project', async () => {
      const project = await detector.detectProject(testDir);

      expect(project).not.toBeNull();
      expect(project!.isFlutterProject).toBe(true);
      expect(project!.name).toBe('test-flutter-app');
      expect(project!.hasAndroid).toBe(true);
      expect(project!.hasIOS).toBe(true);
      expect(project!.pubspecPath).toBe(pubspecPath);
    });

    it('should return null for non-Flutter project', async () => {
      const project = await detector.detectProject(__dirname);
      expect(project).toBeNull();
    });
  });

  describe('validateFlutterProject', () => {
    it('should return valid for correct Flutter project structure', async () => {
      const result = await detector.validateFlutterProject(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing pubspec.yaml', async () => {
      const result = await detector.validateFlutterProject('/non/existent');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('findFlutterProjects', () => {
    it('should find the Flutter project in test directory', async () => {
      const projects = await detector.findFlutterProjects(testDir, 2);
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('test-flutter-app');
    });

    it('should not find any projects in non-Flutter directory', async () => {
      const projects = await detector.findFlutterProjects(__dirname, 2);
      expect(projects.length).toBe(0);
    });
  });
});
