import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { format } from '../utils/SizeUtils';
import { PathStats } from '../utils/FileUtils';

export type CleanLevel = 'fast' | 'standard';

export interface CleanTarget {
  name: string;
  paths: string[];
  stats: PathStats[];
  totalSize: number;
}

export interface InteractiveOptions {
  /** Show progress */
  verbose?: boolean;
  /** Disable colors */
  noColor?: boolean;
}

export class InteractiveCLI {
  private options: InteractiveOptions;

  constructor(options: InteractiveOptions = {}) {
    this.options = {
      verbose: options.verbose ?? true,
      noColor: options.noColor ?? false,
    };
  }

  /**
   * Select clean level
   */
  async selectCleanLevel(): Promise<CleanLevel> {
    const { level } = await inquirer.prompt([
      {
        type: 'list',
        name: 'level',
        message: 'Select clean level:',
        choices: [
          {
            name: 'Fast - Clean build directories only (safer, faster)',
            value: 'fast',
          },
          {
            name: 'Standard - Clean all caches (more space freed)',
            value: 'standard',
          },
        ],
        default: 'standard',
      },
    ]);

    return level;
  }

  /**
   * Confirm cleanup operation
   */
  async confirmClean(targets: CleanTarget[], totalSize: number): Promise<boolean> {
    console.log('\n');
    console.log(chalk.cyan('═══════════════════════════════════════'));
    console.log(chalk.cyan('  Clean Targets'));
    console.log(chalk.cyan('═══════════════════════════════════════'));

    for (const target of targets) {
      console.log(chalk.yellow(`\n${target.name}:`));
      for (const stat of target.stats) {
        const relPath = this.getRelativePath(stat.path, process.cwd());
        const sizeStr = stat.size > 0 ? ` (${format(stat.size)})` : '';
        console.log(chalk.gray(`  - ${relPath}${sizeStr}`));
      }
    }

    console.log('\n');
    console.log(chalk.cyan('═══════════════════════════════════════'));
    console.log(
      chalk.cyan(`  Total: ${format(totalSize)}`)
    );
    console.log(chalk.cyan('═══════════════════════════════════════'));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('Are you sure you want to clean these files?'),
        default: false,
      },
    ]);

    return confirm;
  }

  /**
   * Display clean results
   */
  displayResults(results: {
    success: boolean;
    deletedPaths: string[];
    freedSpace: number;
    errors: Array<{ path: string; message: string }>;
    warningPaths: string[];
  }): void {
    console.log('\n');

    if (results.success) {
      console.log(chalk.green('✓ Cleanup completed successfully!'));
    } else {
      console.log(chalk.yellow('⚠ Cleanup completed with some errors'));
    }

    console.log(chalk.cyan(`  Freed space: ${format(results.freedSpace)}`));
    console.log(chalk.cyan(`  Deleted: ${results.deletedPaths.length} items`));

    if (results.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${results.errors.length}`));
      for (const err of results.errors.slice(0, 5)) {
        console.log(chalk.gray(`    - ${err.path}: ${err.message}`));
      }
      if (results.errors.length > 5) {
        console.log(chalk.gray(`    ... and ${results.errors.length - 5} more`));
      }
    }

    if (results.warningPaths.length > 0) {
      console.log(chalk.yellow(`  Warnings: ${results.warningPaths.length}`));
    }

    console.log('\n');
  }

  /**
   * Display restore instructions
   */
  displayRestoreInstructions(options: {
    cleanedFlutter: boolean;
    cleanedAndroid: boolean;
    cleanedIOS: boolean;
  }): void {
    console.log(chalk.cyan('═══════════════════════════════════════'));
    console.log(chalk.cyan('  Restore Instructions'));
    console.log(chalk.cyan('═══════════════════════════════════════'));

    if (options.cleanedFlutter) {
      console.log(chalk.gray('\n1. Restore Flutter dependencies:'));
      console.log(chalk.white('   $ flutter pub get'));
    }

    if (options.cleanedIOS) {
      console.log(chalk.gray('\n2. Restore iOS dependencies:'));
      console.log(chalk.white('   $ cd ios && pod install && cd ..'));
    }

    if (options.cleanedAndroid) {
      console.log(chalk.gray('\n3. Android dependencies will be restored automatically'));
      console.log(chalk.gray('   on next build'));
    }

    console.log(chalk.gray('\n4. Verify your setup:'));
    console.log(chalk.white('   $ flutter doctor'));
    console.log('\n');
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    console.log(chalk.red(`\n✖ Error: ${message}`));
  }

  /**
   * Show warning message
   */
  showWarning(message: string): void {
    console.log(chalk.yellow(`\n⚠ Warning: ${message}`));
  }

  /**
   * Show info message
   */
  showInfo(message: string): void {
    console.log(chalk.cyan(`\nℹ ${message}`));
  }

  /**
   * Start spinner
   */
  startSpinner(message: string): ora.Ora {
    return ora({
      text: message,
      spinner: 'dots',
    }).start();
  }

  /**
   * Get relative path for display
   */
  private getRelativePath(filePath: string, basePath: string): string {
    const relative = require('path').relative(basePath, filePath);
    return relative || '.';
  }

  /**
   * Display preview of files to be cleaned
   */
  displayPreview(targets: CleanTarget[], totalSize: number): void {
    console.log('\n');
    console.log(chalk.cyan('═══════════════════════════════════════'));
    console.log(chalk.cyan('  Preview'));
    console.log(chalk.cyan('═══════════════════════════════════════'));

    for (const target of targets) {
      console.log(chalk.yellow(`\n${target.name}:`));
      for (const stat of target.stats) {
        const relPath = this.getRelativePath(stat.path, process.cwd());
        const sizeStr = stat.size > 0 ? ` (${format(stat.size)})` : '';
        console.log(chalk.gray(`  - ${relPath}${sizeStr}`));
      }
    }

    console.log('\n');
    console.log(
      chalk.cyan(`Total will be freed: ${format(totalSize)}`)
    );
    console.log('\n');
  }

  /**
   * Show processing status
   */
  showProcessing(cleanerName: string): void {
    if (this.options.verbose) {
      console.log(chalk.gray(`  Cleaning ${cleanerName}...`));
    }
  }

  /**
   * Show completion status
   */
  showCompletion(cleanerName: string, freed: number): void {
    if (this.options.verbose) {
      console.log(
        chalk.green(`  ✓ ${cleanerName}: ${format(freed)} freed`)
      );
    }
  }

  /**
   * Show deep clean warning
   */
  showDeepCleanWarning(): void {
    console.log('\n');
    console.log(chalk.red('═══════════════════════════════════════════════'));
    console.log(chalk.red('  ⚠️  WARNING: Deep Clean Mode'));
    console.log(chalk.red('═══════════════════════════════════════════════'));

    console.log(chalk.yellow('\nThis will clean global caches that may be used by other projects:'));
    console.log(chalk.gray('  • ~/.gradle/caches/ - Gradle dependencies'));
    console.log(chalk.gray('  • ~/.pub-cache/ - Dart package cache'));
    if (process.platform === 'darwin') {
      console.log(chalk.gray('  • ~/Library/Caches/CocoaPods/ - CocoaPods cache'));
    }

    console.log(chalk.yellow('\nAfter cleaning, you will need to re-download all dependencies.'));
    console.log(chalk.yellow('This may take significant time on the next build.'));
    console.log('\n');
  }

  /**
   * Confirm deep clean with project name verification
   */
  async confirmDeepClean(projectName: string): Promise<boolean> {
    // Show warning first
    this.showDeepCleanWarning();

    // Ask for project name confirmation
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: `To confirm, please enter the project name (${projectName}):`,
        validate: (input: string) => {
          return input === projectName || 'Project name does not match';
        },
      },
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Are you absolutely sure you want to perform a deep clean?'),
        default: false,
      },
    ]);

    return confirm;
  }

  /**
   * Display global cache preview
   */
  displayGlobalCachePreview(preview: {
    unusedGradleCount: number;
    unusedGradleSize: number;
    unusedPubCount: number;
    unusedPubSize: number;
    cocoapodsSize: number;
  }): void {
    console.log('\n');
    console.log(chalk.cyan('═══════════════════════════════════════════════'));
    console.log(chalk.cyan('  Global Cache Analysis'));
    console.log(chalk.cyan('═══════════════════════════════════════════════'));

    console.log(chalk.yellow('\nGradle Cache (unused modules):'));
    console.log(chalk.gray(`  - ${preview.unusedGradleCount} modules (${format(preview.unusedGradleSize)})`));

    console.log(chalk.yellow('\nPub Cache (unused packages):'));
    console.log(chalk.gray(`  - ${preview.unusedPubCount} package versions (${format(preview.unusedPubSize)})`));

    if (process.platform === 'darwin') {
      console.log(chalk.yellow('\nCocoaPods Cache:'));
      console.log(chalk.gray(`  - ${format(preview.cocoapodsSize)}`));
    }

    const total = preview.unusedGradleSize + preview.unusedPubSize + preview.cocoapodsSize;
    console.log('\n');
    console.log(chalk.cyan('═══════════════════════════════════════════════'));
    console.log(chalk.cyan(`  Total can be freed: ${format(total)}`));
    console.log(chalk.cyan('═══════════════════════════════════════════════'));
  }

  /**
   * Display deep clean results
   */
  displayDeepCleanResults(results: {
    gradle: { deletedPaths: number; freedSpace: number };
    cocoapods: { deletedPaths: number; freedSpace: number };
    pubCache: { deletedPaths: number; freedSpace: number };
    totalFreedSpace: number;
  }): void {
    console.log('\n');
    console.log(chalk.green('✓ Deep clean completed!'));
    console.log(chalk.cyan('\n═══ Global Cache Summary ═══'));

    console.log(chalk.yellow('\nGradle Cache:'));
    console.log(chalk.gray(`  - ${results.gradle.deletedPaths} modules cleaned`));
    console.log(chalk.gray(`  - ${format(results.gradle.freedSpace)} freed`));

    console.log(chalk.yellow('\nPub Cache:'));
    console.log(chalk.gray(`  - ${results.pubCache.deletedPaths} packages cleaned`));
    console.log(chalk.gray(`  - ${format(results.pubCache.freedSpace)} freed`));

    if (process.platform === 'darwin') {
      console.log(chalk.yellow('\nCocoaPods Cache:'));
      console.log(chalk.gray(`  - ${results.cocoapods.deletedPaths > 0 ? 'Cleaned' : 'None found'}`));
      console.log(chalk.gray(`  - ${format(results.cocoapods.freedSpace)} freed`));
    }

    console.log(chalk.cyan('\n═══════════════════════════════════════'));
    console.log(chalk.cyan(`  Total freed: ${format(results.totalFreedSpace)}`));
    console.log(chalk.cyan('═══════════════════════════════════════'));
  }
}
