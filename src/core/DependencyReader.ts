import * as fs from 'fs-extra';
import * as path from 'path';

export interface PubspecData {
  name: string;
  version?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface LockFileData {
  packages: Record<string, PackageInfo>;
}

export interface PackageInfo {
  version: string;
  source: string;
  dependency: string;
  description?: string;
}

export interface ProjectDependencies {
  projectPath: string;
  projectName: string;
  directDependencies: Set<string>;
  allPackages: Set<string>;
}

export class DependencyReader {
  /**
   * Read pubspec.yaml file
   */
  async readPubspec(pubspecPath: string): Promise<PubspecData | null> {
    try {
      const content = await fs.readFile(pubspecPath, 'utf-8');
      const data = this.parsePubspec(content);
      return data;
    } catch (error) {
      console.warn(`Failed to read pubspec.yaml: ${pubspecPath}`);
      return null;
    }
  }

  /**
   * Parse pubspec.yaml content
   */
  parsePubspec(content: string): PubspecData {
    const data: PubspecData = {
      name: '',
      dependencies: {},
      devDependencies: {},
    };

    const lines = content.split('\n');
    let currentSection: 'dependencies' | 'devDependencies' | 'other' = 'other';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for section headers
      if (trimmed === 'dependencies:' || trimmed.startsWith('dependencies:')) {
        currentSection = 'dependencies';
        continue;
      }
      if (trimmed === 'dev_dependencies:' || trimmed.startsWith('dev_dependencies:')) {
        currentSection = 'devDependencies';
        continue;
      }

      // Parse name
      if (trimmed.startsWith('name:')) {
        data.name = trimmed.replace('name:', '').trim();
        continue;
      }

      // Parse version
      if (trimmed.startsWith('version:')) {
        data.version = trimmed.replace('version:', '').trim();
        continue;
      }

      // Parse dependencies
      if (currentSection !== 'other' && trimmed.includes(':')) {
        const [pkg, version] = trimmed.split(':').map((s) => s.trim());
        if (pkg && version) {
          if (currentSection === 'dependencies') {
            data.dependencies[pkg] = version;
          } else {
            data.devDependencies[pkg] = version;
          }
        }
      }
    }

    return data;
  }

  /**
   * Read pubspec.lock file
   */
  async readLockFile(lockPath: string): Promise<LockFileData | null> {
    try {
      const content = await fs.readFile(lockPath, 'utf-8');
      return this.parseLockFile(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse pubspec.lock content
   */
  parseLockFile(content: string): LockFileData {
    const packages: Record<string, PackageInfo> = {};
    const lines = content.split('\n');
    let currentPackage = '';

    for (const line of lines) {
      // Check indentation before trimming
      // Package names have 2-space indent, properties have 4+ spaces
      const isPackageLine = line.startsWith('  ') && !line.startsWith('    ');
      const trimmed = line.trim();

      // Check for package entry (skip packages: header)
      if (isPackageLine && trimmed.includes(':') && trimmed !== 'packages:') {
        currentPackage = trimmed.replace(':', '').trim();
        if (currentPackage) {
          packages[currentPackage] = {
            version: '',
            source: '',
            dependency: '',
          };
        }
        continue;
      }

      // Parse package properties (lines with 4+ space indent)
      if (currentPackage && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':').map((s) => s.trim());
        if (key === 'version') {
          packages[currentPackage].version = value;
        } else if (key === 'source') {
          packages[currentPackage].source = value;
        } else if (key === 'dependency') {
          packages[currentPackage].dependency = value;
        } else if (key === 'description') {
          packages[currentPackage].description = value;
        }
      }
    }

    return { packages };
  }

  /**
   * Get all dependencies for a project
   */
  async getProjectDependencies(projectPath: string): Promise<ProjectDependencies | null> {
    const pubspecPath = path.join(projectPath, 'pubspec.yaml');
    const lockPath = path.join(projectPath, 'pubspec.lock');

    const pubspec = await this.readPubspec(pubspecPath);
    if (!pubspec) {
      return null;
    }

    const lockData = await this.readLockFile(lockPath);

    // Build package set from lock file
    const allPackages = new Set<string>();
    const directDependencies = new Set<string>();

    if (lockData) {
      for (const [pkg, info] of Object.entries(lockData.packages)) {
        const packageKey = `${pkg}:${info.version}`;
        allPackages.add(packageKey);

        // Check if it's a direct dependency
        if (
          pubspec.dependencies[pkg] ||
          pubspec.devDependencies[pkg]
        ) {
          directDependencies.add(packageKey);
        }
      }
    }

    return {
      projectPath,
      projectName: pubspec.name,
      directDependencies,
      allPackages,
    };
  }

  /**
   * Get all dependencies from multiple projects
   */
  async getAllProjectsDependencies(projectPaths: string[]): Promise<{
    projects: ProjectDependencies[];
    allPackages: Set<string>;
    directDependencies: Set<string>;
  }> {
    const allPackages = new Set<string>();
    const directDependencies = new Set<string>();
    const projects: ProjectDependencies[] = [];

    for (const projectPath of projectPaths) {
      const deps = await this.getProjectDependencies(projectPath);
      if (deps) {
        projects.push(deps);

        for (const pkg of deps.allPackages) {
          allPackages.add(pkg);
        }
        for (const pkg of deps.directDependencies) {
          directDependencies.add(pkg);
        }
      }
    }

    return { projects, allPackages, directDependencies };
  }

  /**
   * Collect package names from package keys (name:version)
   */
  getPackageNames(packageKeys: Set<string>): Set<string> {
    const names = new Set<string>();
    for (const key of packageKeys) {
      const name = key.split(':')[0];
      names.add(name);
    }
    return names;
  }
}
