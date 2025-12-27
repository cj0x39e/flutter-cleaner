import * as path from 'path';

export interface FlutterPaths {
  build: string;
  dartTool: string;
  flutterPlugins: string;
  flutterPluginsDependencies: string;
  packages: string;
}

export interface AndroidPaths {
  build: string;
  appBuild: string;
  gradle: string;
  idea: string;
}

export interface IOSPaths {
  build: string;
  pods: string;
  symlinks: string;
  flutterFramework: string;
  appFramework: string;
}

export interface ProjectPaths {
  flutter: FlutterPaths;
  android: AndroidPaths | null;
  ios: IOSPaths | null;
}

/**
 * Resolve the project root directory
 * If the given path is a Flutter project, return it
 * Otherwise, look for parent directories
 */
export function getProjectRoot(inputPath: string): string {
  // If it's already a directory, check if it's a Flutter project
  // For now, just return the input path as the project root
  return path.resolve(inputPath);
}

/**
 * Get all Flutter-related cache paths
 */
export function resolveFlutterPaths(projectPath: string): FlutterPaths {
  return {
    build: path.join(projectPath, 'build'),
    dartTool: path.join(projectPath, '.dart_tool'),
    flutterPlugins: path.join(projectPath, '.flutter-plugins'),
    flutterPluginsDependencies: path.join(
      projectPath,
      '.flutter-plugins-dependencies'
    ),
    packages: path.join(projectPath, '.packages'),
  };
}

/**
 * Get all Android-related cache paths
 */
export function resolveAndroidPaths(
  projectPath: string
): AndroidPaths | null {
  const androidDir = path.join(projectPath, 'android');

  // Check if Android directory exists
  if (!require('fs').existsSync(androidDir)) {
    return null;
  }

  return {
    build: path.join(androidDir, 'build'),
    appBuild: path.join(androidDir, 'app', 'build'),
    gradle: path.join(androidDir, '.gradle'),
    idea: path.join(androidDir, '.idea'),
  };
}

/**
 * Get all iOS-related cache paths
 */
export function resolveIOSPaths(projectPath: string): IOSPaths | null {
  const iosDir = path.join(projectPath, 'ios');

  // Check if iOS directory exists
  if (!require('fs').existsSync(iosDir)) {
    return null;
  }

  return {
    build: path.join(iosDir, 'build'),
    pods: path.join(iosDir, 'Pods'),
    symlinks: path.join(iosDir, '.symlinks'),
    flutterFramework: path.join(iosDir, 'Flutter', 'Flutter.framework'),
    appFramework: path.join(iosDir, 'Flutter', 'App.framework'),
  };
}

/**
 * Get all cache paths for a Flutter project
 */
export function resolveAllPaths(projectPath: string): ProjectPaths {
  return {
    flutter: resolveFlutterPaths(projectPath),
    android: resolveAndroidPaths(projectPath),
    ios: resolveIOSPaths(projectPath),
  };
}

/**
 * Get all paths to be cleaned for fast mode
 */
export function getFastCleanPaths(projectPath: string): string[] {
  const paths: string[] = [];
  const flutter = resolveFlutterPaths(projectPath);
  const android = resolveAndroidPaths(projectPath);
  const ios = resolveIOSPaths(projectPath);

  // Flutter
  paths.push(flutter.build);

  // Android
  if (android) {
    paths.push(android.build);
    paths.push(android.appBuild);
  }

  // iOS
  if (ios) {
    paths.push(ios.build);
  }

  return paths;
}

/**
 * Get all paths to be cleaned for standard mode
 */
export function getStandardCleanPaths(projectPath: string): string[] {
  const paths: string[] = [];
  const flutter = resolveFlutterPaths(projectPath);
  const android = resolveAndroidPaths(projectPath);
  const ios = resolveIOSPaths(projectPath);

  // Flutter
  paths.push(flutter.build);
  paths.push(flutter.dartTool);
  paths.push(flutter.flutterPlugins);
  paths.push(flutter.flutterPluginsDependencies);
  paths.push(flutter.packages);

  // Android
  if (android) {
    paths.push(android.build);
    paths.push(android.appBuild);
    paths.push(android.gradle);
    paths.push(android.idea);
  }

  // iOS
  if (ios) {
    paths.push(ios.build);
    paths.push(ios.pods);
    paths.push(ios.symlinks);
    paths.push(ios.flutterFramework);
    paths.push(ios.appFramework);
  }

  return paths;
}

/**
 * Get the home directory path
 */
export function getHomeDir(): string {
  return require('os').homedir();
}

/**
 * Get global pub-cache path
 */
export function getPubCachePath(): string {
  const os = require('os');
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Pub', 'Cache');
  }
  return path.join(os.homedir(), '.pub-cache');
}

/**
 * Get global Gradle cache path
 */
export function getGradleCachePath(): string {
  return path.join(getHomeDir(), '.gradle', 'caches');
}

/**
 * Get CocoaPods cache path (macOS only)
 */
export function getCocoaPodsCachePath(): string {
  if (process.platform !== 'darwin') {
    throw new Error('CocoaPods is only supported on macOS');
  }
  return path.join(getHomeDir(), 'Library', 'Caches', 'CocoaPods');
}
