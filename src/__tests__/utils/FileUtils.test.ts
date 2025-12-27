import * as fs from 'fs-extra';
import * as path from 'path';
import {
  exists,
  isDirectory,
  isFile,
  remove,
  getSize,
  readDir,
  readDirWithTypes,
  getAllFiles,
  getTotalSize,
  getPathStats,
  PathStats,
} from '../../utils/FileUtils';

describe('FileUtils', () => {
  const testDir = path.join(__dirname, 'test-files');
  const testFile = path.join(testDir, 'test.txt');
  const nestedDir = path.join(testDir, 'nested');
  const nestedFile = path.join(nestedDir, 'nested.txt');

  beforeAll(async () => {
    await fs.ensureDir(nestedDir);
    await fs.writeFile(testFile, 'test content');
    await fs.writeFile(nestedFile, 'nested content');
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('exists', () => {
    it('should return true for existing path', async () => {
      expect(await exists(testFile)).toBe(true);
    });

    it('should return false for non-existing path', async () => {
      expect(await exists(path.join(testDir, 'non-existent.txt'))).toBe(
        false
      );
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', async () => {
      expect(await isDirectory(testDir)).toBe(true);
    });

    it('should return false for file', async () => {
      expect(await isDirectory(testFile)).toBe(false);
    });

    it('should return false for non-existing path', async () => {
      expect(await isDirectory(path.join(testDir, 'non-existent'))).toBe(
        false
      );
    });
  });

  describe('isFile', () => {
    it('should return true for file', async () => {
      expect(await isFile(testFile)).toBe(true);
    });

    it('should return false for directory', async () => {
      expect(await isFile(testDir)).toBe(false);
    });
  });

  describe('getSize', () => {
    it('should return file size', async () => {
      const size = await getSize(testFile);
      expect(size).toBeGreaterThan(0);
    });

    it('should return directory size', async () => {
      const size = await getSize(testDir);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for non-existing path', async () => {
      const size = await getSize(path.join(testDir, 'non-existent'));
      expect(size).toBe(0);
    });
  });

  describe('readDir', () => {
    it('should return directory contents', async () => {
      const contents = await readDir(testDir);
      expect(contents).toContain('test.txt');
      expect(contents).toContain('nested');
    });
  });

  describe('readDirWithTypes', () => {
    it('should return directory contents with types', async () => {
      const contents = await readDirWithTypes(testDir);
      const file = contents.find((c) => c.name === 'test.txt');
      const dir = contents.find((c) => c.name === 'nested');

      expect(file?.isFile()).toBe(true);
      expect(dir?.isDirectory()).toBe(true);
    });
  });

  describe('getAllFiles', () => {
    it('should return all files recursively', async () => {
      const files = await getAllFiles(testDir);
      expect(files).toHaveLength(2);
      expect(files).toContain(testFile);
      expect(files).toContain(nestedFile);
    });
  });

  describe('getTotalSize', () => {
    it('should return total size of multiple paths', async () => {
      const total = await getTotalSize([testFile, nestedFile]);
      expect(total).toBeGreaterThan(0);
    });

    it('should skip non-existing paths', async () => {
      const total = await getTotalSize([
        testFile,
        path.join(testDir, 'non-existent'),
      ]);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('getPathStats', () => {
    it('should return stats for multiple paths', async () => {
      const stats = await getPathStats([testFile, nestedFile, testDir]);
      expect(stats).toHaveLength(3);

      const fileStat = stats.find((s: PathStats) => !s.isDirectory);
      const dirStat = stats.find((s: PathStats) => s.isDirectory);

      expect(fileStat?.isDirectory).toBe(false);
      expect(dirStat?.isDirectory).toBe(true);
    });
  });
});
