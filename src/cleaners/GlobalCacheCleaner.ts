import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { BaseCleaner, CleanResult } from './BaseCleaner';
import { format } from '../utils/SizeUtils';

export interface GlobalCacheCleanOptions {
  /** Clean Gradle global cache */
  gradle?: boolean;
  /** Clean CocoaPods global cache */
  cocoaPods?: boolean;
  /** Clean Pub global cache */
  pubCache?: boolean;
}

export class GlobalCacheCleaner extends BaseCleaner {
  private options: GlobalCacheCleanOptions;
  private usedPackages: Set<string>;
  private usedPackageNames: Set<string>;

  constructor(
    options: GlobalCacheCleanOptions = {},
    usedPackages: Set<string> = new Set()
  ) {
    super('Global Cache');

    this.options = {
      gradle: options.gradle ?? true,
      cocoaPods: options.cocoaPods ?? true,
      pubCache: options.pubCache ?? true,
    };

    this.usedPackages = usedPackages;
    this.usedPackageNames = this.extractPackageNames(usedPackages);
  }

  /**
   * Extract package names from package keys
   */
  private extractPackageNames(packageKeys: Set<string>): Set<string> {
    const names = new Set<string>();
    for (const key of packageKeys) {
      const name = key.split(':')[0];
      names.add(name);
    }
    return names;
  }

  /**
   * Get Gradle global cache path
   */
  getGradleCachePath(): string {
    return path.join(os.homedir(), '.gradle', 'caches');
  }

  /**
   * Get CocoaPods cache path (macOS only)
   */
  getCocoaPodsCachePath(): string {
    if (process.platform !== 'darwin') {
      throw new Error('CocoaPods is only supported on macOS');
    }
    return path.join(os.homedir(), 'Library', 'Caches', 'CocoaPods');
  }

  /**
   * Get Pub cache path
   */
  getPubCachePath(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || '', 'Pub', 'Cache');
    }
    return path.join(os.homedir(), '.pub-cache');
  }

  /**
   * Find unused Gradle cache modules
   */
  async findUnusedGradleModules(): Promise<string[]> {
    const gradlePath = this.getGradleCachePath();

    if (!(await fs.pathExists(gradlePath))) {
      return [];
    }

    const unused: string[] = [];

    // Check modules-2 directory (Gradle 4+)
    const modulesPath = path.join(gradlePath, 'modules-2');
    if (await fs.pathExists(modulesPath)) {
      const entries = await fs.readdir(modulesPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Check if this module is used
          const moduleKey = entry.name;
          if (!this.isPackageUsed(moduleKey)) {
            unused.push(path.join(modulesPath, entry.name));
          }
        }
      }
    }

    // Check jars directory
    const jarsPath = path.join(gradlePath, 'jars');
    if (await fs.pathExists(jarsPath)) {
      const jars = await fs.readdir(jarsPath);
      for (const jar of jars) {
        unused.push(path.join(jarsPath, jar));
      }
    }

    return unused;
  }

  /**
   * Check if a package name is used
   */
  private isPackageUsed(packageName: string): boolean {
    // Check exact match
    if (this.usedPackageNames.has(packageName)) {
      return true;
    }

    // Check for partial matches (e.g., 'flutter' in 'flutter_plugin')
    for (const used of this.usedPackageNames) {
      if (packageName.includes(used) || used.includes(packageName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find unused Pub packages
   */
  async findUnusedPubPackages(): Promise<string[]> {
    const pubCache = this.getPubCachePath();

    if (!(await fs.pathExists(pubCache))) {
      return [];
    }

    const unused: string[] = [];

    // Check hosted directory
    const hostedPath = path.join(pubCache, 'hosted');
    if (await fs.pathExists(hostedPath)) {
      const packages = await fs.readdir(hostedPath);

      for (const pkg of packages) {
        const pkgPath = path.join(hostedPath, pkg);

        if (!(await fs.pathExists(pkgPath))) continue;

        const versions = await fs.readdir(pkgPath);

        for (const version of versions) {
          const packageKey = `${pkg}:${version}`;

          // Skip if used
          if (this.usedPackages.has(packageKey)) {
            continue;
          }

          // Also check if package name is used
          if (this.usedPackageNames.has(pkg)) {
            continue;
          }

          unused.push(path.join(pkgPath, version));
        }
      }
    }

    // Check git directory
    const gitPath = path.join(pubCache, 'git');
    if (await fs.pathExists(gitPath)) {
      const repos = await fs.readdir(gitPath);
      // Git dependencies are harder to match, so we'll clean them carefully
      for (const repo of repos) {
        const repoPath = path.join(gitPath, repo);
        if ((await fs.stat(repoPath)).isDirectory()) {
          // Check if repo is used by looking at commit folders
          const commits = await fs.readdir(repoPath);
          for (const commit of commits) {
            const commitPath = path.join(repoPath, commit);
            if ((await fs.stat(commitPath)).isDirectory()) {
              // Check if this git dependency is referenced
              const packageKey = `git ${repo}#${commit}`;
              if (!this.isPackageUsed(packageKey.replace(/\s+/g, '_'))) {
                unused.push(commitPath);
              }
            }
          }
        }
      }
    }

    return unused;
  }

  /**
   * Get paths for deep clean mode
   */
  getPaths(projectPath: string): string[] {
    // Global cache cleaner doesn't use project path
    // It works with global cache directories
    return [];
  }

  /**
   * Clean Gradle global cache (smart clean)
   */
  async cleanGradleCache(): Promise<CleanResult> {
    if (!this.options.gradle) {
      return {
        success: true,
        deletedPaths: [],
        freedSpace: 0,
        errors: [],
        warningPaths: [],
      };
    }

    const unusedModules = await this.findUnusedGradleModules();
    const result: CleanResult = {
      success: true,
      deletedPaths: [],
      freedSpace: 0,
      errors: [],
      warningPaths: [],
    };

    for (const modulePath of unusedModules) {
      try {
        const size = await fs.pathExists(modulePath)
          ? require('../utils/FileUtils').getSize(modulePath)
          : 0;

        await fs.remove(modulePath);

        result.deletedPaths.push(modulePath);
        result.freedSpace += size;
      } catch (error) {
        result.errors.push({
          path: modulePath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Clean CocoaPods global cache
   */
  async cleanCocoaPodsCache(): Promise<CleanResult> {
    if (!this.options.cocoaPods || process.platform !== 'darwin') {
      return {
        success: true,
        deletedPaths: [],
        freedSpace: 0,
        errors: [],
        warningPaths: [],
      };
    }

    const cocoapodsPath = this.getCocoaPodsCachePath();

    if (!(await fs.pathExists(cocoapodsPath))) {
      return {
        success: true,
        deletedPaths: [],
        freedSpace: 0,
        errors: [],
        warningPaths: [],
      };
    }

    const result: CleanResult = {
      success: true,
      deletedPaths: [],
      freedSpace: 0,
      errors: [],
      warningPaths: [],
    };

    try {
      const stats = await require('../utils/FileUtils').getPathStats([cocoapodsPath]);
      const size = stats.reduce((acc: number, s: { size: number }) => acc + s.size, 0);

      await fs.remove(cocoapodsPath);

      result.deletedPaths.push(cocoapodsPath);
      result.freedSpace = size;
    } catch (error) {
      result.errors.push({
        path: cocoapodsPath,
        message: error instanceof Error ? error.message : String(error),
      });
      result.success = false;
    }

    return result;
  }

  /**
   * Clean unused Pub packages
   */
  async cleanPubCache(): Promise<CleanResult> {
    if (!this.options.pubCache) {
      return {
        success: true,
        deletedPaths: [],
        freedSpace: 0,
        errors: [],
        warningPaths: [],
      };
    }

    const unusedPackages = await this.findUnusedPubPackages();
    const result: CleanResult = {
      success: true,
      deletedPaths: [],
      freedSpace: 0,
      errors: [],
      warningPaths: [],
    };

    for (const pkgPath of unusedPackages) {
      try {
        const size = await require('../utils/FileUtils').getSize(pkgPath);

        await fs.remove(pkgPath);

        result.deletedPaths.push(pkgPath);
        result.freedSpace += size;
      } catch (error) {
        result.errors.push({
          path: pkgPath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Perform all global cache cleaning
   */
  async cleanAll(): Promise<{
    gradle: CleanResult;
    cocoapods: CleanResult;
    pubCache: CleanResult;
    totalFreedSpace: number;
  }> {
    const [gradle, cocoapods, pubCache] = await Promise.all([
      this.cleanGradleCache(),
      this.cleanCocoaPodsCache(),
      this.cleanPubCache(),
    ]);

    const totalFreedSpace = gradle.freedSpace + cocoapods.freedSpace + pubCache.freedSpace;

    return {
      gradle,
      cocoapods,
      pubCache,
      totalFreedSpace,
    };
  }

  /**
   * Get preview of what will be cleaned
   */
  async getPreview(): Promise<{
    unusedGradleCount: number;
    unusedGradleSize: number;
    unusedPubCount: number;
    unusedPubSize: number;
    cocoapodsSize: number;
  }> {
    const unusedGradle = await this.findUnusedGradleModules();
    const unusedPub = await this.findUnusedPubPackages();

    let unusedGradleSize = 0;
    for (const p of unusedGradle) {
      unusedGradleSize += await require('../utils/FileUtils').getSize(p);
    }

    let unusedPubSize = 0;
    for (const p of unusedPub) {
      unusedPubSize += await require('../utils/FileUtils').getSize(p);
    }

    let cocoapodsSize = 0;
    if (process.platform === 'darwin') {
      const cocoapodsPath = this.getCocoaPodsCachePath();
      if (await fs.pathExists(cocoapodsPath)) {
        cocoapodsSize = await require('../utils/FileUtils').getSize(cocoapodsPath);
      }
    }

    return {
      unusedGradleCount: unusedGradle.length,
      unusedGradleSize,
      unusedPubCount: unusedPub.length,
      unusedPubSize,
      cocoapodsSize,
    };
  }
}
