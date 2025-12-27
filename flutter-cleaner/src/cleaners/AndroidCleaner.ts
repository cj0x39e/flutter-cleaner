import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';

export interface AndroidCleanOptions {
  /** Clean build directories */
  build?: boolean;
  /** Clean .gradle directory */
  gradle?: boolean;
  /** Clean .idea directory */
  idea?: boolean;
}

export class AndroidCleaner extends BaseCleaner {
  private options: AndroidCleanOptions;

  constructor(options: AndroidCleanOptions = {}) {
    super('Android');

    this.options = {
      build: options.build ?? true,
      gradle: options.gradle ?? true,
      idea: options.idea ?? false,
    };
  }

  getPaths(projectPath: string): string[] {
    const androidDir = path.join(projectPath, 'android');
    const paths: string[] = [];

    if (!(this.options.build || this.options.gradle || this.options.idea)) {
      return paths;
    }

    if (this.options.build) {
      paths.push(path.join(androidDir, 'build'));
      paths.push(path.join(androidDir, 'app', 'build'));
    }

    if (this.options.gradle) {
      paths.push(path.join(androidDir, '.gradle'));
    }

    if (this.options.idea) {
      paths.push(path.join(androidDir, '.idea'));
    }

    return paths;
  }

  /**
   * Get paths for fast clean mode
   */
  static getFastPaths(projectPath: string): string[] {
    const androidDir = path.join(projectPath, 'android');
    return [
      path.join(androidDir, 'build'),
      path.join(androidDir, 'app', 'build'),
    ];
  }

  /**
   * Get paths for standard clean mode
   */
  static getStandardPaths(projectPath: string): string[] {
    const androidDir = path.join(projectPath, 'android');
    return [
      path.join(androidDir, 'build'),
      path.join(androidDir, 'app', 'build'),
      path.join(androidDir, '.gradle'),
      path.join(androidDir, '.idea'),
    ];
  }
}
