import * as path from 'path';
import chalk from 'chalk';
import { exists, getSize, remove, getPathStats, PathStats } from '../utils/FileUtils';
import { format } from '../utils/SizeUtils';

export interface CleanResult {
  success: boolean;
  deletedPaths: string[];
  freedSpace: number;
  errors: Array<{ path: string; message: string }>;
  warningPaths: string[];
}

export interface CleanOptions {
  /** Whether to actually delete files or just simulate */
  dryRun?: boolean;
  /** Whether to show progress */
  verbose?: boolean;
}

/**
 * Base cleaner class that provides common functionality for all cleaners
 */
export abstract class BaseCleaner {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Get the display name of the cleaner
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get paths that this cleaner will clean
   */
  abstract getPaths(projectPath: string): string[];

  /**
   * Validate that paths are safe to clean
   */
  protected async validatePaths(paths: string[]): Promise<{
    valid: boolean;
    invalidPaths: string[];
  }> {
    const invalidPaths: string[] = [];

    for (const p of paths) {
      if (!(await exists(p))) {
        continue; // Skip non-existing paths
      }

      // Check if path is within the project
      const normalizedPath = path.normalize(p);
      if (normalizedPath.includes('..')) {
        invalidPaths.push(p);
      }
    }

    return {
      valid: invalidPaths.length === 0,
      invalidPaths,
    };
  }

  /**
   * Calculate total size of paths
   */
  protected async calculateSize(paths: string[]): Promise<number> {
    return getSize(paths.reduce((acc, p) => acc + p, ''));
  }

  /**
   * Get path statistics for display
   */
  protected async getPathStats(paths: string[]): Promise<PathStats[]> {
    const existingPaths = paths.filter((p) => p); // Filter empty strings
    return getPathStats(existingPaths);
  }

  /**
   * Format paths for display
   */
  protected formatPathForDisplay(filePath: string, basePath: string): string {
    if (filePath.startsWith(basePath)) {
      return filePath.replace(basePath, '').replace(/^\//, '') || './';
    }
    return filePath;
  }

  /**
   * Perform the cleanup
   */
  async clean(
    projectPath: string,
    options: CleanOptions = {}
  ): Promise<CleanResult> {
    const { dryRun = false, verbose = false } = options;

    const paths = this.getPaths(projectPath);
    const result: CleanResult = {
      success: true,
      deletedPaths: [],
      freedSpace: 0,
      errors: [],
      warningPaths: [],
    };

    // Filter out non-existing paths
    const existingPaths: string[] = [];
    for (const p of paths) {
      if (await exists(p)) {
        existingPaths.push(p);
      }
    }

    if (existingPaths.length === 0) {
      if (verbose) {
        console.log(chalk.gray(`  No ${this.name} cache found.`));
      }
      return result;
    }

    // Calculate total size
    const totalSize = await getPathStats(existingPaths).then((stats) =>
      stats.reduce((acc, s) => acc + s.size, 0)
    );

    if (verbose) {
      const relativePaths = existingPaths.map((p) =>
        this.formatPathForDisplay(p, projectPath)
      );
      console.log(chalk.cyan(`  ${this.name}:`));
      for (const p of relativePaths) {
        console.log(chalk.gray(`    - ${p}`));
      }
      console.log(chalk.gray(`    Total: ${format(totalSize)}`));
    }

    // Perform cleanup
    for (const p of existingPaths) {
      try {
        if (dryRun) {
          result.deletedPaths.push(p);
        } else {
          await remove(p);
          result.deletedPaths.push(p);
          result.freedSpace += await getSize(p);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push({ path: p, message });

        // Check if it's a warning (permission denied, etc.) or error
        if (message.includes('ENOENT') || message.includes('permission')) {
          result.warningPaths.push(p);
        } else {
          result.success = false;
        }
      }
    }

    if (!dryRun) {
      result.freedSpace = totalSize;
    }

    return result;
  }

  /**
   * Preview what will be cleaned
   */
  async preview(projectPath: string): Promise<{
    paths: string[];
    totalSize: number;
  }> {
    const paths = this.getPaths(projectPath);
    const stats = await getPathStats(
      paths.filter((p) => p && path.isAbsolute(p))
    );

    return {
      paths: stats.filter((s) => s.size > 0).map((s) => s.path),
      totalSize: stats.reduce((acc, s) => acc + s.size, 0),
    };
  }

  /**
   * Get the relative name for display
   */
  getRelativePath(filePath: string, projectPath: string): string {
    const relative = path.relative(projectPath, filePath);
    return relative || '.';
  }
}
