#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ProjectDetector } from './core/ProjectDetector';
import { FlutterCleaner } from './cleaners/FlutterCleaner';
import { AndroidCleaner } from './cleaners/AndroidCleaner';
import { IOSCleaner } from './cleaners/IOSCleaner';
import { InteractiveCLI, CleanLevel } from './cli/InteractiveCLI';
import { format } from './utils/SizeUtils';
import { getPathStats, PathStats } from './utils/FileUtils';

interface CleanTarget {
  name: string;
  paths: string[];
  stats: PathStats[];
  totalSize: number;
}

interface CleanResult {
  success: boolean;
  deletedPaths: string[];
  freedSpace: number;
  errors: Array<{ path: string; message: string }>;
  warningPaths: string[];
}

const program = new Command();

program
  .name('flutter-cleaner')
  .description('A CLI tool to clean Flutter project cache and build artifacts')
  .version('1.0.0');

program
  .option('-p, --project <path>', 'Flutter project path (default: current directory)')
  .option('-f, --fast', 'Fast clean mode (build directories only)')
  .option('-s, --standard', 'Standard clean mode (includes caches)')
  .option('-d, --dry-run', 'Preview mode (show what would be cleaned without deleting)')
  .option('--no-color', 'Disable colored output')
  .action(async (options) => {
    const cli = new InteractiveCLI({ verbose: true, noColor: options.noColor });

    console.log(chalk.blue('🚀 Flutter Cleaner v1.0.0'));
    console.log(chalk.gray('Starting cleanup...\n'));

    // Determine project path
    let projectPath = options.project || process.cwd();
    projectPath = path.resolve(projectPath);

    // Validate project
    const detector = new ProjectDetector();
    const isFlutter = await detector.isFlutterProject(projectPath);

    if (!isFlutter) {
      cli.showError(`Not a Flutter project: ${projectPath}`);
      console.log(chalk.gray('\nMake sure the directory contains pubspec.yaml'));
      process.exit(1);
    }

    const projectName = await detector.getProjectName(projectPath);
    console.log(chalk.cyan(`📁 Project: ${projectName}`));
    console.log(chalk.cyan(`📂 Path: ${projectPath}`));

    // Determine clean level
    let cleanLevel: CleanLevel = 'standard';
    if (options.fast) {
      cleanLevel = 'fast';
    } else if (options.standard) {
      cleanLevel = 'standard';
    }

    console.log(chalk.cyan(`🧹 Mode: ${cleanLevel === 'fast' ? 'Fast' : 'Standard'}`));

    if (options.dryRun) {
      console.log(chalk.yellow('\n👁️  Preview mode - no files will be deleted\n'));
    }

    // Get clean targets
    const targets: CleanTarget[] = [];
    let hasAndroid = false;
    let hasIOS = false;

    // Flutter
    const flutterPaths =
      cleanLevel === 'fast'
        ? FlutterCleaner.getFastPaths(projectPath)
        : FlutterCleaner.getStandardPaths(projectPath);
    const flutterStats = await getPathStats(flutterPaths);
    const flutterTotal = flutterStats.reduce((acc, s) => acc + s.size, 0);
    if (flutterStats.length > 0) {
      targets.push({
        name: 'Flutter',
        paths: flutterPaths,
        stats: flutterStats,
        totalSize: flutterTotal,
      });
    }

    // Android
    hasAndroid = await detector.hasAndroid(projectPath);
    if (hasAndroid) {
      const androidPaths =
        cleanLevel === 'fast'
          ? AndroidCleaner.getFastPaths(projectPath)
          : AndroidCleaner.getStandardPaths(projectPath);
      const androidStats = await getPathStats(androidPaths);
      const androidTotal = androidStats.reduce((acc, s) => acc + s.size, 0);
      if (androidStats.length > 0) {
        targets.push({
          name: 'Android',
          paths: androidPaths,
          stats: androidStats,
          totalSize: androidTotal,
        });
      }
    }

    // iOS
    hasIOS = await detector.hasIOS(projectPath);
    if (hasIOS) {
      const iosPaths =
        cleanLevel === 'fast'
          ? IOSCleaner.getFastPaths(projectPath)
          : IOSCleaner.getStandardPaths(projectPath);
      const iosStats = await getPathStats(iosPaths);
      const iosTotal = iosStats.reduce((acc, s) => acc + s.size, 0);
      if (iosStats.length > 0) {
        targets.push({
          name: 'iOS',
          paths: iosPaths,
          stats: iosStats,
          totalSize: iosTotal,
        });
      }
    }

    // Calculate total size
    const totalSize = targets.reduce((acc, t) => acc + t.totalSize, 0);

    if (totalSize === 0) {
      console.log(chalk.green('\n✓ No cache files found to clean!'));
      process.exit(0);
    }

    // Show preview
    if (options.dryRun) {
      cli.displayPreview(targets, totalSize);
    } else {
      // Confirm cleanup
      const confirmed = await cli.confirmClean(targets, totalSize);

      if (!confirmed) {
        console.log(chalk.gray('\n✖ Cleanup cancelled'));
        process.exit(0);
      }
    }

    // Perform cleanup
    console.log(chalk.gray('\n🧹 Cleaning...\n'));

    const overallResult: CleanResult = {
      success: true,
      deletedPaths: [],
      freedSpace: 0,
      errors: [],
      warningPaths: [],
    };

    for (const target of targets) {
      const spinner = cli.startSpinner(`Cleaning ${target.name}...`);

      try {
        let result: CleanResult;

        switch (target.name) {
          case 'Flutter':
            result = await new FlutterCleaner().clean(projectPath, {
              dryRun: options.dryRun,
            });
            break;
          case 'Android':
            result = await new AndroidCleaner().clean(projectPath, {
              dryRun: options.dryRun,
            });
            break;
          case 'iOS':
            result = await new IOSCleaner().clean(projectPath, {
              dryRun: options.dryRun,
            });
            break;
          default:
            result = {
              success: true,
              deletedPaths: [],
              freedSpace: 0,
              errors: [],
              warningPaths: [],
            };
        }

        overallResult.deletedPaths.push(...result.deletedPaths);
        overallResult.freedSpace += result.freedSpace;
        overallResult.errors.push(...result.errors);
        overallResult.warningPaths.push(...result.warningPaths);

        if (result.success) {
          spinner.succeed(
            chalk.green(`${target.name}: ${format(result.freedSpace)} freed`)
          );
        } else {
          spinner.fail(chalk.red(`${target.name}: failed`));
          overallResult.success = false;
        }
      } catch (error) {
        spinner.fail(chalk.red(`${target.name}: ${error}`));
        overallResult.success = false;
      }
    }

    // Display results
    cli.displayResults({
      ...overallResult,
      freedSpace: options.dryRun ? totalSize : overallResult.freedSpace,
    });

    // Show restore instructions
    const hasFlutter = targets.some((t) => t.name === 'Flutter');

    if (!options.dryRun) {
      cli.displayRestoreInstructions({
        cleanedFlutter: hasFlutter,
        cleanedAndroid: hasAndroid,
        cleanedIOS: hasIOS,
      });
    }

    // Exit with appropriate code
    if (!overallResult.success && overallResult.errors.length > 0) {
      process.exit(1);
    }
  });

program.parse();

export default program;
