import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../../core/ConfigManager';

describe('ConfigManager', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-config');
  const testConfigPath = path.join(testDir, 'test-config.json');
  let configManager: ConfigManager;

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    configManager = new ConfigManager(testConfigPath);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  beforeEach(async () => {
    // Clean up test config file before each test
    if (await fs.pathExists(testConfigPath)) {
      await fs.remove(testConfigPath);
    }
  });

  describe('getDefaultConfig', () => {
    it('should return valid default config', () => {
      const config = configManager.getDefaultConfig();

      expect(config.version).toBe('1.0');
      expect(config.cleanOptions).toBeDefined();
      expect(config.cleanOptions.flutter.build).toBe(true);
      expect(config.cleanOptions.android.build).toBe(true);
      expect(config.cleanOptions.ios.build).toBe(true);
      expect(config.safeMode).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return false when config does not exist', async () => {
      expect(await configManager.exists()).toBe(false);
    });

    it('should return true when config exists', async () => {
      await fs.writeFile(testConfigPath, '{}');
      expect(await configManager.exists()).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      const config = await configManager.loadConfig();
      expect(config.version).toBe('1.0');
    });

    it('should load existing config', async () => {
      const testConfig = {
        version: '1.0',
        cleanOptions: {
          flutter: { build: false, dartTool: true, pluginFiles: true },
          android: { build: true, gradle: false, idea: true, globalCache: false },
          ios: { build: true, pods: false, symlinks: true, frameworks: true, globalCache: false },
        },
        safeMode: false,
      };
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const config = await configManager.loadConfig();

      expect(config.version).toBe('1.0');
      expect(config.cleanOptions.flutter.build).toBe(false);
      expect(config.cleanOptions.android.gradle).toBe(false);
      expect(config.cleanOptions.ios.pods).toBe(false);
      expect(config.safeMode).toBe(false);
    });

    it('should merge partial config with defaults', async () => {
      const testConfig = {
        version: '2.0',
        safeMode: false,
      };
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const config = await configManager.loadConfig();

      expect(config.version).toBe('2.0');
      expect(config.cleanOptions.flutter.build).toBe(true); // default
      expect(config.safeMode).toBe(false);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const config = configManager.getDefaultConfig();
      config.version = '1.1';

      await configManager.saveConfig(config);

      const exists = await fs.pathExists(testConfigPath);
      expect(exists).toBe(true);

      const saved = JSON.parse(await fs.readFile(testConfigPath, 'utf-8'));
      expect(saved.version).toBe('1.1');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = configManager.getDefaultConfig();
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing version', () => {
      const config = configManager.getDefaultConfig();
      config.version = undefined as any;

      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('version is required');
    });

    it('should detect invalid boolean values', () => {
      const config = configManager.getDefaultConfig();
      config.cleanOptions.flutter.build = 'true' as any;

      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('flutter.build'))).toBe(true);
    });
  });

  describe('initializeConfig', () => {
    it('should create default config file', async () => {
      await configManager.initializeConfig();

      const exists = await fs.pathExists(testConfigPath);
      expect(exists).toBe(true);

      const config = await configManager.loadConfig();
      expect(config.version).toBe('1.0');
    });
  });

  describe('updateOption', () => {
    it('should update specific option', async () => {
      await configManager.saveConfig(configManager.getDefaultConfig());

      await configManager.updateOption('safeMode', false);

      const config = await configManager.loadConfig();
      expect(config.safeMode).toBe(false);
    });
  });

  describe('updateCleanOptions', () => {
    it('should update flutter clean options', async () => {
      await configManager.saveConfig(configManager.getDefaultConfig());

      await configManager.updateCleanOptions('flutter', { build: false });

      const config = await configManager.loadConfig();
      expect(config.cleanOptions.flutter.build).toBe(false);
      expect(config.cleanOptions.flutter.dartTool).toBe(true); // unchanged
    });

    it('should update android clean options', async () => {
      await configManager.saveConfig(configManager.getDefaultConfig());

      await configManager.updateCleanOptions('android', { gradle: false });

      const config = await configManager.loadConfig();
      expect(config.cleanOptions.android.gradle).toBe(false);
    });
  });

  describe('getConfigDir', () => {
    it('should return config directory', () => {
      const dir = configManager.getConfigDir();
      expect(dir).toBe(testDir);
    });
  });
});
