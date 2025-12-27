import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface FlutterCleanOptions {
  build: boolean;
  dartTool: boolean;
  pluginFiles: boolean;
}

export interface AndroidCleanOptions {
  build: boolean;
  gradle: boolean;
  idea: boolean;
  globalCache: boolean;
}

export interface IOSCleanOptions {
  build: boolean;
  pods: boolean;
  symlinks: boolean;
  frameworks: boolean;
  globalCache: boolean;
}

export interface ConfigCleanOptions {
  flutter: FlutterCleanOptions;
  android: AndroidCleanOptions;
  ios: IOSCleanOptions;
}

export interface Config {
  version: string;
  cleanOptions: ConfigCleanOptions;
  safeMode: boolean;
  backupBeforeClean: boolean;
  showSizeBefore: boolean;
  excludePatterns: string[];
}

export interface ProjectConfig {
  name: string;
  path: string;
  enabled: boolean;
}

export class ConfigManager {
  private readonly configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
  }

  /**
   * Get the default config path
   */
  private getDefaultConfigPath(): string {
    return path.join(os.homedir(), '.flutter-cleaner.json');
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): Config {
    return {
      version: '1.0',
      cleanOptions: {
        flutter: {
          build: true,
          dartTool: true,
          pluginFiles: true,
        },
        android: {
          build: true,
          gradle: true,
          idea: false,
          globalCache: false,
        },
        ios: {
          build: true,
          pods: true,
          symlinks: true,
          frameworks: true,
          globalCache: false,
        },
      },
      safeMode: true,
      backupBeforeClean: false,
      showSizeBefore: true,
      excludePatterns: [],
    };
  }

  /**
   * Check if config file exists
   */
  async exists(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<Config> {
    const exists = await this.exists();

    if (!exists) {
      return this.getDefaultConfig();
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content);
      return this.mergeWithDefaults(config);
    } catch (error) {
      console.warn(`Failed to load config: ${error}`);
      return this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: Config): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Merge loaded config with defaults
   */
  private mergeWithDefaults(config: Partial<Config>): Config {
    const defaults = this.getDefaultConfig();

    return {
      version: config.version || defaults.version,
      cleanOptions: {
        flutter: {
          ...defaults.cleanOptions.flutter,
          ...config.cleanOptions?.flutter,
        },
        android: {
          ...defaults.cleanOptions.android,
          ...config.cleanOptions?.android,
        },
        ios: {
          ...defaults.cleanOptions.ios,
          ...config.cleanOptions?.ios,
        },
      },
      safeMode: config.safeMode ?? defaults.safeMode,
      backupBeforeClean: config.backupBeforeClean ?? defaults.backupBeforeClean,
      showSizeBefore: config.showSizeBefore ?? defaults.showSizeBefore,
      excludePatterns: config.excludePatterns || defaults.excludePatterns,
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Config): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.version) {
      errors.push('version is required');
    }

    if (!config.cleanOptions) {
      errors.push('cleanOptions is required');
    } else {
      if (typeof config.cleanOptions.flutter?.build !== 'boolean') {
        errors.push('flutter.build must be a boolean');
      }
      if (typeof config.cleanOptions.android?.build !== 'boolean') {
        errors.push('android.build must be a boolean');
      }
      if (typeof config.cleanOptions.ios?.build !== 'boolean') {
        errors.push('ios.build must be a boolean');
      }
    }

    if (typeof config.safeMode !== 'boolean') {
      errors.push('safeMode must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get config directory
   */
  getConfigDir(): string {
    return path.dirname(this.configPath);
  }

  /**
   * Initialize default config file
   */
  async initializeConfig(): Promise<void> {
    const config = this.getDefaultConfig();
    await this.saveConfig(config);
    console.log(`Config initialized at: ${this.configPath}`);
  }

  /**
   * Update specific option
   */
  async updateOption<K extends keyof Config>(
    key: K,
    value: Config[K]
  ): Promise<void> {
    const config = await this.loadConfig();
    config[key] = value;
    await this.saveConfig(config);
  }

  /**
   * Update clean options
   */
  async updateCleanOptions(
    platform: 'flutter' | 'android' | 'ios',
    options: Partial<FlutterCleanOptions> | Partial<AndroidCleanOptions> | Partial<IOSCleanOptions>
  ): Promise<void> {
    const config = await this.loadConfig();
    config.cleanOptions[platform] = {
      ...config.cleanOptions[platform],
      ...options,
    } as any;
    await this.saveConfig(config);
  }
}
