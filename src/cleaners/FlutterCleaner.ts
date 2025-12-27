import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';

export interface FlutterCleanOptions {
  /** Clean build directory */
  build?: boolean;
  /** Clean .dart_tool directory */
  dartTool?: boolean;
  /** Clean plugin files */
  pluginFiles?: boolean;
}

export class FlutterCleaner extends BaseCleaner {
  private options: FlutterCleanOptions;

  constructor(options: FlutterCleanOptions = {}) {
    super('Flutter');

    this.options = {
      build: options.build ?? true,
      dartTool: options.dartTool ?? true,
      pluginFiles: options.pluginFiles ?? true,
    };
  }

  getPaths(projectPath: string): string[] {
    const paths: string[] = [];

    if (this.options.build) {
      paths.push(path.join(projectPath, 'build'));
    }

    if (this.options.dartTool) {
      paths.push(path.join(projectPath, '.dart_tool'));
    }

    if (this.options.pluginFiles) {
      paths.push(path.join(projectPath, '.flutter-plugins'));
      paths.push(path.join(projectPath, '.flutter-plugins-dependencies'));
      paths.push(path.join(projectPath, '.packages'));
    }

    return paths;
  }

  /**
   * Get paths for fast clean mode
   */
  static getFastPaths(projectPath: string): string[] {
    return [path.join(projectPath, 'build')];
  }

  /**
   * Get paths for standard clean mode
   */
  static getStandardPaths(projectPath: string): string[] {
    return [
      path.join(projectPath, 'build'),
      path.join(projectPath, '.dart_tool'),
      path.join(projectPath, '.flutter-plugins'),
      path.join(projectPath, '.flutter-plugins-dependencies'),
      path.join(projectPath, '.packages'),
    ];
  }
}
