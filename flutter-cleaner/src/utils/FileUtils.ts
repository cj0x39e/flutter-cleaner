import * as fs from 'fs-extra';
import * as path from 'path';

export interface PathStats {
  path: string;
  size: number;
  isDirectory: boolean;
}

/**
 * Check if a path exists
 */
export async function exists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Remove a file or directory
 */
export async function remove(filePath: string): Promise<void> {
  await fs.remove(filePath);
}

/**
 * Get the size of a file or directory in bytes
 */
export async function getSize(filePath: string): Promise<number> {
  let stats: fs.Stats;
  try {
    stats = await fs.stat(filePath);
  } catch {
    return 0;
  }

  if (stats.isFile()) {
    return stats.size;
  }

  if (stats.isDirectory()) {
    let totalSize = 0;
    const items = await fs.readdir(filePath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(filePath, item.name);
      totalSize += await getSize(itemPath);
    }

    return totalSize;
  }

  return 0;
}

/**
 * Read directory contents
 */
export async function readDir(dirPath: string): Promise<string[]> {
  return fs.readdir(dirPath);
}

/**
 * Read directory contents with file types
 */
export async function readDirWithTypes(
  dirPath: string
): Promise<fs.Dirent[]> {
  return fs.readdir(dirPath, { withFileTypes: true });
}

/**
 * Get all files in a directory recursively
 */
export async function getAllFiles(
  dirPath: string,
  files: string[] = []
): Promise<string[]> {
  const items = await readDirWithTypes(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      await getAllFiles(itemPath, files);
    } else if (item.isFile()) {
      files.push(itemPath);
    }
  }

  return files;
}

/**
 * Calculate total size of multiple paths
 */
export async function getTotalSize(paths: string[]): Promise<number> {
  let total = 0;

  for (const p of paths) {
    if (await exists(p)) {
      total += await getSize(p);
    }
  }

  return total;
}

/**
 * Get directory statistics for multiple paths
 */
export async function getPathStats(
  paths: string[]
): Promise<PathStats[]> {
  const stats: PathStats[] = [];

  for (const p of paths) {
    if (await exists(p)) {
      const size = await getSize(p);
      stats.push({
        path: p,
        size,
        isDirectory: await isDirectory(p),
      });
    }
  }

  return stats;
}
