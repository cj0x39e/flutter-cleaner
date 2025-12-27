import * as fs from 'fs-extra';
import * as path from 'path';

export interface ProjectInfo {
  path: string;
  name: string;
  isFlutterProject: boolean;
  hasAndroid: boolean;
  hasIOS: boolean;
  hasWeb: boolean;
  pubspecPath: string;
  pubspecLockPath: string;
}

export class ProjectDetector {
  /**
   * Check if a directory is a Flutter project by looking for pubspec.yaml
   */
  async isFlutterProject(dirPath: string): Promise<boolean> {
    const pubspecPath = path.join(dirPath, 'pubspec.yaml');
    return fs.pathExists(pubspecPath);
  }

  /**
   * Check if the project has Android support
   */
  async hasAndroid(dirPath: string): Promise<boolean> {
    const androidDir = path.join(dirPath, 'android');
    const hasDir = await fs.pathExists(androidDir);
    if (!hasDir) return false;

    // Check for essential Android files
    const buildGradle = path.join(androidDir, 'build.gradle');
    const settingsGradle = path.join(androidDir, 'settings.gradle');
    const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');

    return (await fs.pathExists(buildGradle)) && (await fs.pathExists(settingsGradle));
  }

  /**
   * Check if the project has iOS support
   */
  async hasIOS(dirPath: string): Promise<boolean> {
    const iosDir = path.join(dirPath, 'ios');
    const hasDir = await fs.pathExists(iosDir);
    if (!hasDir) return false;

    // Check for essential iOS files
    const infoPlist = path.join(iosDir, 'Runner', 'Info.plist');
    const podfile = path.join(iosDir, 'Podfile');

    return await fs.pathExists(infoPlist);
  }

  /**
   * Check if the project has Web support
   */
  async hasWeb(dirPath: string): Promise<boolean> {
    const webDir = path.join(dirPath, 'web');
    return fs.pathExists(webDir);
  }

  /**
   * Get the project name from pubspec.yaml
   */
  async getProjectName(dirPath: string): Promise<string> {
    const pubspecPath = path.join(dirPath, 'pubspec.yaml');

    try {
      const content = await fs.readFile(pubspecPath, 'utf-8');
      // Match the name field in pubspec.yaml
      const match = content.match(/^name:\s*(.+)$/m);
      if (match) {
        return match[1].trim();
      }
    } catch {
      // Ignore errors
    }

    // Fallback to directory name
    return path.basename(dirPath);
  }

  /**
   * Detect and return information about a Flutter project
   */
  async detectProject(dirPath: string): Promise<ProjectInfo | null> {
    const isFlutter = await this.isFlutterProject(dirPath);

    if (!isFlutter) {
      return null;
    }

    const name = await this.getProjectName(dirPath);
    const pubspecPath = path.join(dirPath, 'pubspec.yaml');
    const pubspecLockPath = path.join(dirPath, 'pubspec.lock');

    return {
      path: path.resolve(dirPath),
      name,
      isFlutterProject: true,
      hasAndroid: await this.hasAndroid(dirPath),
      hasIOS: await this.hasIOS(dirPath),
      hasWeb: await this.hasWeb(dirPath),
      pubspecPath,
      pubspecLockPath,
    };
  }

  /**
   * Find all Flutter projects in a directory (recursive)
   */
  async findFlutterProjects(
    rootPath: string,
    maxDepth: number = 3
  ): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];

    async function search(
      currentPath: string,
      currentDepth: number
    ): Promise<void> {
      if (currentDepth > maxDepth) return;

      const project = await new ProjectDetector().detectProject(currentPath);
      if (project) {
        projects.push(project);
        return; // Don't search inside found project
      }

      // Search subdirectories
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await search(path.join(currentPath, entry.name), currentDepth + 1);
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }

    await search(rootPath, 0);
    return projects;
  }

  /**
   * Validate that a path is a valid Flutter project
   */
  async validateFlutterProject(dirPath: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    const pubspecPath = path.join(dirPath, 'pubspec.yaml');
    if (!(await fs.pathExists(pubspecPath))) {
      errors.push('pubspec.yaml not found');
    }

    const libDir = path.join(dirPath, 'lib');
    if (!(await fs.pathExists(libDir))) {
      errors.push('lib directory not found');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
