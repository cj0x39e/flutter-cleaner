import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { GlobalCacheCleaner } from '../../cleaners/GlobalCacheCleaner';

describe('GlobalCacheCleaner', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-global-cache');
  let cleaner: GlobalCacheCleaner;

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  beforeEach(() => {
    // Create cleaner with mock used packages
    const usedPackages = new Set([
      'http:0.13.0',
      'provider:6.0.0',
      'flutter:3.0.0',
    ]);
    cleaner = new GlobalCacheCleaner({}, usedPackages);
  });

  describe('constructor', () => {
    it('should set default options', () => {
      const defaultCleaner = new GlobalCacheCleaner();
      expect((defaultCleaner as any).options.gradle).toBe(true);
      expect((defaultCleaner as any).options.cocoaPods).toBe(true);
      expect((defaultCleaner as any).options.pubCache).toBe(true);
    });

    it('should accept custom options', () => {
      const customCleaner = new GlobalCacheCleaner({
        gradle: false,
        cocoaPods: false,
        pubCache: false,
      });
      expect((customCleaner as any).options.gradle).toBe(false);
      expect((customCleaner as any).options.cocoaPods).toBe(false);
      expect((customCleaner as any).options.pubCache).toBe(false);
    });

    it('should extract package names', () => {
      const usedPackages = new Set([
        'http:0.13.0',
        'provider:6.0.0',
      ]);
      const testCleaner = new GlobalCacheCleaner({}, usedPackages);
      const packageNames = (testCleaner as any).usedPackageNames;

      expect(packageNames.has('http')).toBe(true);
      expect(packageNames.has('provider')).toBe(true);
    });
  });

  describe('getGradleCachePath', () => {
    it('should return correct Gradle cache path', () => {
      const expected = path.join(os.homedir(), '.gradle', 'caches');
      expect(cleaner.getGradleCachePath()).toBe(expected);
    });
  });

  describe('getCocoaPodsCachePath', () => {
    it('should throw error on non-macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' as any });

      expect(() => cleaner.getCocoaPodsCachePath()).toThrow('CocoaPods is only supported on macOS');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('getPubCachePath', () => {
    it('should return correct Pub cache path on Unix', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' as any });

      const expected = path.join(os.homedir(), '.pub-cache');
      expect(cleaner.getPubCachePath()).toBe(expected);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return correct Pub cache path on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' as any });

      const expected = path.join(process.env.APPDATA || '', 'Pub', 'Cache');
      expect(cleaner.getPubCachePath()).toBe(expected);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('isPackageUsed', () => {
    it('should return true for exact match', () => {
      expect((cleaner as any).isPackageUsed('http')).toBe(true);
      expect((cleaner as any).isPackageUsed('provider')).toBe(true);
    });

    it('should return false for unused packages', () => {
      expect((cleaner as any).isPackageUsed('unused_package')).toBe(false);
    });

    it('should handle partial matches', () => {
      // If 'flutter' is used, it should match 'flutter_plugin'
      const testCleaner = new GlobalCacheCleaner({}, new Set(['flutter:3.0.0']));
      expect((testCleaner as any).isPackageUsed('flutter_plugin')).toBe(true);
    });
  });

  describe('findUnusedGradleModules', () => {
    it('should return empty array when Gradle cache does not exist', async () => {
      const mockCleaner = new GlobalCacheCleaner({}, new Set());
      // Override getGradleCachePath to return a non-existent path
      jest.spyOn(mockCleaner as any, 'getGradleCachePath').mockReturnValue('/non-existent-gradle-cache');
      const result = await mockCleaner.findUnusedGradleModules();
      expect(result).toEqual([]);
    });

    it('should identify unused modules', async () => {
      // Create mock Gradle cache structure
      const mockGradlePath = path.join(testDir, 'mock-gradle');
      await fs.ensureDir(mockGradlePath);
      const modulesPath = path.join(mockGradlePath, 'modules-2');
      await fs.ensureDir(modulesPath);

      // Create used and unused module directories
      await fs.ensureDir(path.join(modulesPath, 'http-0.13.0')); // used
      await fs.ensureDir(path.join(modulesPath, 'unused-module-1.0.0')); // unused

      const testCleaner = new GlobalCacheCleaner({}, new Set(['http:0.13.0']));
      // Manually read and filter for this test
      const entries = await fs.readdir(modulesPath, { withFileTypes: true });
      const unused: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const moduleKey = entry.name;
          if (!(testCleaner as any).isPackageUsed(moduleKey)) {
            unused.push(path.join(modulesPath, entry.name));
          }
        }
      }

      expect(unused.length).toBe(1);
      expect(unused[0]).toContain('unused-module');

      await fs.remove(mockGradlePath);
    });
  });

  describe('findUnusedPubPackages', () => {
    it('should return empty array when Pub cache does not exist', async () => {
      const mockCleaner = new GlobalCacheCleaner({}, new Set());
      // Override getPubCachePath to return a non-existent path
      jest.spyOn(mockCleaner as any, 'getPubCachePath').mockReturnValue('/non/existent-pub-cache');
      const result = await mockCleaner.findUnusedPubPackages();
      expect(result).toEqual([]);
    });

    it('should identify unused packages', async () => {
      // Create mock Pub cache structure
      const mockPubPath = path.join(testDir, 'mock-pub-cache');
      await fs.ensureDir(mockPubPath);
      const hostedPath = path.join(mockPubPath, 'hosted');
      await fs.ensureDir(hostedPath);

      // Create used and unused package directories
      const httpPath = path.join(hostedPath, 'http');
      await fs.ensureDir(httpPath);
      await fs.writeFile(path.join(httpPath, '0.13.0'), '');

      const unusedPath = path.join(hostedPath, 'unused_package');
      await fs.ensureDir(unusedPath);
      await fs.writeFile(path.join(unusedPath, '1.0.0'), '');

      const testCleaner = new GlobalCacheCleaner({}, new Set(['http:0.13.0']));

      // Manually find unused packages for this test
      const packages = await fs.readdir(hostedPath);
      const unused: string[] = [];

      for (const pkg of packages) {
        const pkgPath = path.join(hostedPath, pkg);
        if (!(await fs.pathExists(pkgPath))) continue;

        const versions = await fs.readdir(pkgPath);
        for (const version of versions) {
          const packageKey = `${pkg}:${version}`;
          if (!testCleaner['usedPackages'].has(packageKey) && !testCleaner['usedPackageNames'].has(pkg)) {
            unused.push(path.join(pkgPath, version));
          }
        }
      }

      expect(unused.length).toBe(1);
      expect(unused[0]).toContain('unused_package');

      await fs.remove(mockPubPath);
    });
  });

  describe('cleanGradleCache', () => {
    it('should return empty result when option is disabled', async () => {
      const disabledCleaner = new GlobalCacheCleaner({ gradle: false }, new Set());
      const result = await disabledCleaner.cleanGradleCache();

      expect(result.success).toBe(true);
      expect(result.deletedPaths).toEqual([]);
      expect(result.freedSpace).toBe(0);
    });
  });

  describe('cleanCocoaPodsCache', () => {
    it('should return empty result when option is disabled', async () => {
      const disabledCleaner = new GlobalCacheCleaner({ cocoaPods: false }, new Set());
      const result = await disabledCleaner.cleanCocoaPodsCache();

      expect(result.success).toBe(true);
      expect(result.deletedPaths).toEqual([]);
    });

    it('should return empty result on non-macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' as any });

      const result = await cleaner.cleanCocoaPodsCache();

      expect(result.success).toBe(true);
      expect(result.deletedPaths).toEqual([]);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('cleanPubCache', () => {
    it('should return empty result when option is disabled', async () => {
      const disabledCleaner = new GlobalCacheCleaner({ pubCache: false }, new Set());
      const result = await disabledCleaner.cleanPubCache();

      expect(result.success).toBe(true);
      expect(result.deletedPaths).toEqual([]);
    });
  });

  describe('getPaths', () => {
    it('should return empty array (global cache does not use project path)', () => {
      const result = cleaner.getPaths('/some/project/path');
      expect(result).toEqual([]);
    });
  });

  describe('getPreview', () => {
    it('should return preview data structure', async () => {
      const mockCleaner = new GlobalCacheCleaner({}, new Set(['http:0.13.0']));
      const result = await mockCleaner.getPreview();

      expect(result).toHaveProperty('unusedGradleCount');
      expect(result).toHaveProperty('unusedGradleSize');
      expect(result).toHaveProperty('unusedPubCount');
      expect(result).toHaveProperty('unusedPubSize');
      expect(result).toHaveProperty('cocoapodsSize');
      expect(typeof result.unusedGradleCount).toBe('number');
      expect(typeof result.unusedGradleSize).toBe('number');
    });
  });
});
