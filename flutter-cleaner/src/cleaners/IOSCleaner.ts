import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';

export interface IOSCleanOptions {
  /** Clean build directory */
  build?: boolean;
  /** Clean Pods directory */
  pods?: boolean;
  /** Clean .symlinks directory */
  symlinks?: boolean;
  /** Clean Flutter frameworks */
  frameworks?: boolean;
}

export class IOSCleaner extends BaseCleaner {
  private options: IOSCleanOptions;

  constructor(options: IOSCleanOptions = {}) {
    super('iOS');

    this.options = {
      build: options.build ?? true,
      pods: options.pods ?? true,
      symlinks: options.symlinks ?? true,
      frameworks: options.frameworks ?? true,
    };
  }

  getPaths(projectPath: string): string[] {
    const iosDir = path.join(projectPath, 'ios');
    const paths: string[] = [];

    if (!(this.options.build || this.options.pods || this.options.symlinks || this.options.frameworks)) {
      return paths;
    }

    if (this.options.build) {
      paths.push(path.join(iosDir, 'build'));
    }

    if (this.options.pods) {
      paths.push(path.join(iosDir, 'Pods'));
    }

    if (this.options.symlinks) {
      paths.push(path.join(iosDir, '.symlinks'));
    }

    if (this.options.frameworks) {
      paths.push(path.join(iosDir, 'Flutter', 'Flutter.framework'));
      paths.push(path.join(iosDir, 'Flutter', 'App.framework'));
    }

    return paths;
  }

  /**
   * Get paths for fast clean mode
   */
  static getFastPaths(projectPath: string): string[] {
    const iosDir = path.join(projectPath, 'ios');
    return [path.join(iosDir, 'build')];
  }

  /**
   * Get paths for standard clean mode
   */
  static getStandardPaths(projectPath: string): string[] {
    const iosDir = path.join(projectPath, 'ios');
    return [
      path.join(iosDir, 'build'),
      path.join(iosDir, 'Pods'),
      path.join(iosDir, '.symlinks'),
      path.join(iosDir, 'Flutter', 'Flutter.framework'),
      path.join(iosDir, 'Flutter', 'App.framework'),
    ];
  }
}
